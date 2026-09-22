package id.movetra.driver;

import android.content.Context;
import org.json.JSONArray;
import org.json.JSONObject;
import java.io.InputStream;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;

/** Single synchronized owner of the native session; web login uses a separate session. */
final class Backend {
    static final class Failure extends IOException {
        final int status;
        final String code;
        Failure(int status, String code) { super("Permintaan server gagal (" + status + ")."); this.status = status; this.code = code; }
        boolean denied() { return status == 401 || status == 403 || "42501".equals(code); }
    }
    private static Backend instance;
    static synchronized Backend get(Context context) {
        if (instance == null) instance = new Backend(context);
        return instance;
    }
    private final SessionStore store;
    private volatile JSONObject session;
    private Backend(Context context) {
        store = new SessionStore(context);
        try { session = store.read(); } catch (Exception ignored) { store.clear(); }
    }
    boolean signedIn() { return session != null; }
    String name() { JSONObject current = session; return current == null ? "" : current.optString("driver_name", "Driver"); }
    synchronized String userId() throws Exception {
        if (session == null) throw new Failure(401, "session_missing");
        return session.getJSONObject("user").getString("id");
    }
    private String request(String path, JSONObject body, String token) throws Exception {
        HttpURLConnection connection = (HttpURLConnection) new URL(BuildConfig.SUPABASE_URL + path).openConnection();
        connection.setConnectTimeout(15_000); connection.setReadTimeout(15_000);
        connection.setInstanceFollowRedirects(false);
        connection.setRequestProperty("apikey", BuildConfig.SUPABASE_KEY);
        if (token != null) connection.setRequestProperty("Authorization", "Bearer " + token);
        try {
            if (body != null) {
                connection.setRequestMethod("POST"); connection.setDoOutput(true);
                connection.setRequestProperty("Content-Type", "application/json");
                try (java.io.OutputStream output = connection.getOutputStream()) { output.write(body.toString().getBytes(StandardCharsets.UTF_8)); }
            }
            int status = connection.getResponseCode();
            String result = "";
            InputStream stream = status >= 400 ? connection.getErrorStream() : connection.getInputStream();
            if (stream != null) try (InputStream input = stream; ByteArrayOutputStream output = new ByteArrayOutputStream()) {
                byte[] buffer = new byte[8192]; int count;
                while ((count = input.read(buffer)) != -1) {
                    output.write(buffer, 0, count);
                    if (output.size() > 1024 * 1024) throw new IOException("Respons terlalu besar.");
                }
                result = output.toString("UTF-8");
            }
            if (status < 200 || status >= 300) {
                String code = "";
                try { code = new JSONObject(result).optString("code", ""); } catch (Exception ignored) { }
                throw new Failure(status, code);
            }
            return result;
        } finally { connection.disconnect(); }
    }
    synchronized void login(String identifier, String password) throws Exception {
        if (session != null) throw new IOException("Keluar dari akun sebelumnya terlebih dahulu.");
        for (String email : TrackingRules.loginEmails(identifier)) {
            JSONObject candidate;
            try { candidate = new JSONObject(request("/auth/v1/token?grant_type=password", new JSONObject().put("email", email).put("password", password), null)); }
            catch (Failure failure) { if (failure.status == 400) continue; throw failure; }
            String id = candidate.getJSONObject("user").getString("id");
            JSONArray profiles = new JSONArray(request("/rest/v1/users?id=eq." + id + "&select=nama,role,status", null, candidate.getString("access_token")));
            if (profiles.length() != 1 || !profiles.getJSONObject(0).optBoolean("status") || !"DRIVER".equals(profiles.getJSONObject(0).optString("role")))
                throw new IOException("Gunakan akun driver yang aktif.");
            candidate.put("expires_at", System.currentTimeMillis() / 1000 + candidate.getLong("expires_in"));
            candidate.put("driver_name", profiles.getJSONObject(0).getString("nama"));
            store.write(candidate); session = candidate; return;
        }
        throw new IOException("ID atau kata sandi tidak sesuai.");
    }
    private String token() throws Exception {
        if (session == null) throw new Failure(401, "session_missing");
        if (session.optLong("expires_at") < System.currentTimeMillis() / 1000 + 90) {
            JSONObject refreshed;
            try { refreshed = new JSONObject(request("/auth/v1/token?grant_type=refresh_token", new JSONObject().put("refresh_token", session.getString("refresh_token")), null)); }
            catch (Failure failure) {
                if (failure.status == 400 || failure.denied()) { store.clear(); session = null; throw new Failure(401, "session_expired"); }
                throw failure;
            }
            refreshed.put("expires_at", System.currentTimeMillis() / 1000 + refreshed.getLong("expires_in"));
            refreshed.put("driver_name", session.optString("driver_name"));
            store.write(refreshed); session = refreshed;
        }
        return session.getString("access_token");
    }
    synchronized String activeTrip() throws Exception {
        String access = token();
        JSONArray profiles = new JSONArray(request("/rest/v1/users?id=eq." + userId() + "&select=role,status", null, access));
        if (profiles.length() != 1 || !profiles.getJSONObject(0).optBoolean("status") || !"DRIVER".equals(profiles.getJSONObject(0).optString("role"))) throw new Failure(403, "42501");
        JSONArray trips = new JSONArray(request("/rest/v1/vehicle_logs?driver_id=eq." + userId() + "&jam_akhir=is.null&status=eq.Belum%20Selesai&select=id&order=created_at.desc&limit=1", null, access));
        return trips.length() == 0 ? null : trips.getJSONObject(0).getString("id");
    }
    synchronized void send(JSONObject point) throws Exception { request("/rest/v1/rpc/record_tracking_point", point, token()); }
    synchronized void logout() {
        // Always clear locally, including offline; revoke this native session when reachable.
        JSONObject previous = session;
        session = null; store.clear();
        if (previous != null) try { request("/auth/v1/logout?scope=local", new JSONObject(), previous.getString("access_token")); } catch (Exception ignored) { }
    }
}
