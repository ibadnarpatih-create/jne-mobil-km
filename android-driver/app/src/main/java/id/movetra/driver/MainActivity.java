package id.movetra.driver;

import android.Manifest;
import android.app.*;
import android.content.*;
import android.content.pm.PackageManager;
import android.net.Uri;
import android.os.*;
import android.provider.MediaStore;
import android.view.*;
import android.webkit.*;
import android.widget.*;
import androidx.core.content.FileProvider;
import androidx.webkit.*;
import org.json.JSONObject;
import java.io.File;
import java.util.*;
import java.util.concurrent.*;

/** Only the trusted HTTPS main frame may access the location/session bridge. */
public final class MainActivity extends Activity {
    private static final String ORIGIN = "https://jne.movetra.id";
    private final ExecutorService worker = Executors.newSingleThreadExecutor();
    private final Handler main = new Handler(Looper.getMainLooper());
    private WebView web;
    private TextView banner;
    private Backend backend;
    private boolean visible;
    private boolean connected;
    private boolean permissionPending;
    private ValueCallback<Uri[]> fileResult;
    private Uri cameraUri;
    private GeolocationPermissions.Callback geoCallback;
    private String geoOrigin;
    static boolean trusted(Uri uri) {
        return uri != null && "https".equals(uri.getScheme()) && "jne.movetra.id".equals(uri.getHost()) && (uri.getPort() == -1 || uri.getPort() == 443);
    }
    @Override public void onCreate(Bundle state) {
        super.onCreate(state);
        backend = Backend.get(this);
        LinearLayout root = new LinearLayout(this); root.setOrientation(LinearLayout.VERTICAL);
        root.setOnApplyWindowInsetsListener((view, insets) -> { view.setPadding(insets.getSystemWindowInsetLeft(), insets.getSystemWindowInsetTop(), insets.getSystemWindowInsetRight(), insets.getSystemWindowInsetBottom()); return insets; });
        banner = new TextView(this); banner.setPadding(16, 12, 16, 12); banner.setText("Memuat aplikasi driver…"); root.addView(banner);
        web = new WebView(this); root.addView(web, new LinearLayout.LayoutParams(-1, 0, 1)); setContentView(root);
        WebSettings settings = web.getSettings(); settings.setJavaScriptEnabled(true); settings.setDomStorageEnabled(true);
        settings.setAllowFileAccess(false); settings.setAllowContentAccess(true); settings.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
        settings.setGeolocationEnabled(true); settings.setJavaScriptCanOpenWindowsAutomatically(false);
        settings.setUserAgentString(settings.getUserAgentString() + " MovetraAndroid/0.2.0");
        CookieManager.getInstance().setAcceptCookie(true); CookieManager.getInstance().setAcceptThirdPartyCookies(web, false);
        if (!WebViewFeature.isFeatureSupported(WebViewFeature.WEB_MESSAGE_LISTENER)) {
            banner.setText("Perbarui Android System WebView melalui Play Store agar aplikasi bisa digunakan."); return;
        }
        WebViewCompat.addWebMessageListener(web, "MovetraNative", Collections.singleton(ORIGIN), (view, message, origin, mainFrame, reply) -> {
            if (!mainFrame || !trusted(origin) || !trusted(Uri.parse(web.getUrl() == null ? "" : web.getUrl()))) return;
            String raw = message.getData();
            if (raw == null || raw.length() > 16384) return;
            connected = true; banner.setVisibility(View.GONE);
            try {
                JSONObject request = new JSONObject(raw);
                String id = request.getString("id"); String command = request.getString("command");
                if ("stop".equals(command) || "logout".equals(command)) stopService(new Intent(this, TrackingService.class));
                worker.execute(() -> {
                    JSONObject response = new JSONObject();
                    try {
                        response.put("id", id);
                        switch (command) {
                            case "login":
                                backend.logout();
                                try (PointQueue queue = new PointQueue(this)) { queue.clear(); }
                                backend.login(request.getString("identifier"), request.getString("password"));
                                try { if (backend.activeTrip() != null) main.post(this::requestTracking); } catch (Exception ignored) { }
                                response.put("value", true); break;
                            case "logout":
                                backend.logout();
                                try (PointQueue queue = new PointQueue(this)) { queue.clear(); }
                                response.put("value", true); break;
                            case "start":
                                if (!backend.signedIn()) throw new Exception("Keluar lalu masuk kembali untuk menghubungkan GPS.");
                                if (backend.activeTrip() == null) throw new Exception("Tidak ada perjalanan aktif. Simpan KM awal terlebih dahulu.");
                                main.post(this::requestTracking); response.put("value", true); break;
                            case "stop": response.put("value", true); break;
                            case "status":
                                response.put("value", new JSONObject().put("running", TrackingService.running).put("signedIn", backend.signedIn())
                                    .put("message", getSharedPreferences("tracking-status", 0).getString("message", "GPS mengikuti perjalanan aktif."))); break;
                            default: throw new Exception("Perintah APK tidak didukung.");
                        }
                    } catch (Exception error) {
                        try { response.put("error", error instanceof Backend.Failure ? "Tidak dapat menghubungkan GPS. Periksa akun dan jaringan." : error.getMessage()); } catch (Exception ignored) { }
                        if ("start".equals(command)) main.post(() -> status("KM sudah tersimpan. GPS belum aktif; periksa jaringan lalu tekan Aktifkan GPS perjalanan."));
                    }
                    main.post(() -> { if (!isDestroyed() && trusted(Uri.parse(web.getUrl() == null ? "" : web.getUrl()))) reply.postMessage(response.toString()); });
                });
            } catch (Exception ignored) { }
        });
        web.setWebViewClient(new WebViewClient() {
            @Override public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                if (trusted(request.getUrl())) return false;
                if (request.isForMainFrame() && "https".equals(request.getUrl().getScheme())) {
                    try { startActivity(new Intent(Intent.ACTION_VIEW, request.getUrl())); } catch (ActivityNotFoundException ignored) { }
                }
                return true;
            }
            @Override public void onPageStarted(WebView view, String url, android.graphics.Bitmap icon) {
                connected = false; banner.setVisibility(View.VISIBLE); banner.setText("Memuat aplikasi driver…");
            }
            @Override public void onPageFinished(WebView view, String url) {
                CookieManager.getInstance().flush();
                main.postDelayed(() -> {
                    if (!isDestroyed() && !connected) { banner.setVisibility(View.VISIBLE); banner.setText("Tampilan driver siap. Penghubung GPS web belum terdeteksi; versi web terintegrasi perlu dipublikasikan."); }
                }, 6000);
            }
            @Override public void onReceivedError(WebView view, WebResourceRequest request, WebResourceError error) {
                if (request.isForMainFrame()) { banner.setVisibility(View.VISIBLE); banner.setText("Halaman tidak dapat dimuat. Periksa internet. Ketuk di sini untuk mencoba lagi."); banner.setOnClickListener(v -> web.loadUrl(BuildConfig.DRIVER_URL)); }
            }
            // Default SSL handling cancels certificate errors; never bypass TLS validation.
        });
        web.setWebChromeClient(new WebChromeClient() {
            @Override public boolean onShowFileChooser(WebView view, ValueCallback<Uri[]> callback, FileChooserParams params) {
                if (!trusted(Uri.parse(view.getUrl() == null ? "" : view.getUrl()))) return false;
                if (fileResult != null) fileResult.onReceiveValue(null);
                fileResult = callback;
                new AlertDialog.Builder(MainActivity.this).setTitle("Foto kendaraan")
                    .setItems(new String[] { "Ambil foto", "Pilih dari galeri" }, (dialog, which) -> choosePhoto(which == 0))
                    .setOnCancelListener(dialog -> finishFile(null)).show();
                return true;
            }
            @Override public void onGeolocationPermissionsShowPrompt(String origin, GeolocationPermissions.Callback callback) {
                if (!trusted(Uri.parse(origin))) { callback.invoke(origin, false, false); return; }
                if (checkSelfPermission(Manifest.permission.ACCESS_FINE_LOCATION) == PackageManager.PERMISSION_GRANTED) callback.invoke(origin, true, false);
                else {
                    if (geoCallback != null) geoCallback.invoke(geoOrigin, false, false);
                    geoCallback = callback; geoOrigin = origin;
                    requestPermissions(new String[] { Manifest.permission.ACCESS_COARSE_LOCATION, Manifest.permission.ACCESS_FINE_LOCATION }, 20);
                }
            }
        });
        web.loadUrl(BuildConfig.DRIVER_URL);
    }
    private void choosePhoto(boolean camera) {
        try {
            cameraUri = null;
            Intent intent;
            if (camera) {
                File directory = new File(getCacheDir(), "camera");
                if (!directory.exists() && !directory.mkdirs()) throw new Exception();
                File photo = File.createTempFile("km-", ".jpg", directory);
                cameraUri = FileProvider.getUriForFile(this, getPackageName() + ".files", photo);
                intent = new Intent(MediaStore.ACTION_IMAGE_CAPTURE).putExtra(MediaStore.EXTRA_OUTPUT, cameraUri);
                intent.setClipData(ClipData.newRawUri("Foto KM", cameraUri));
                intent.addFlags(Intent.FLAG_GRANT_WRITE_URI_PERMISSION | Intent.FLAG_GRANT_READ_URI_PERMISSION);
            } else { intent = new Intent(Intent.ACTION_GET_CONTENT).setType("image/*").addCategory(Intent.CATEGORY_OPENABLE); }
            startActivityForResult(intent, 30);
        } catch (Exception error) { finishFile(null); Toast.makeText(this, "Kamera/galeri tidak tersedia.", Toast.LENGTH_LONG).show(); }
    }
    private void finishFile(Uri[] values) { if (fileResult != null) { fileResult.onReceiveValue(values); fileResult = null; } }
    @Override protected void onActivityResult(int request, int result, Intent data) {
        super.onActivityResult(request, result, data);
        if (request == 30) {
            Uri selected = result == RESULT_OK ? (cameraUri != null ? cameraUri : data == null ? null : data.getData()) : null;
            finishFile(selected == null ? null : new Uri[] { selected }); cameraUri = null;
        }
    }
    private void requestTracking() {
        if (!visible || TrackingService.running || permissionPending) return;
        if (getSharedPreferences("tracking-consent", 0).getBoolean("accepted", false) &&
            checkSelfPermission(Manifest.permission.ACCESS_FINE_LOCATION) == PackageManager.PERMISSION_GRANTED &&
            (Build.VERSION.SDK_INT < 33 || checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS) == PackageManager.PERMISSION_GRANTED)) {
            launchTracking(); return;
        }
        new AlertDialog.Builder(this).setTitle("GPS perjalanan")
            .setMessage("Lokasi dibagikan ke admin selama perjalanan, termasuk saat layar terkunci. Notifikasi GPS tetap tampil. Izinkan lokasi presisi dan notifikasi untuk melanjutkan.")
            .setNegativeButton("Nanti", (dialog, which) -> status("GPS belum aktif. Tekan Aktifkan GPS perjalanan untuk melanjutkan."))
            .setPositiveButton("Aktifkan", (dialog, which) -> {
                getSharedPreferences("tracking-consent", 0).edit().putBoolean("accepted", true).apply();
                ArrayList<String> permissions = new ArrayList<>();
                if (checkSelfPermission(Manifest.permission.ACCESS_FINE_LOCATION) != PackageManager.PERMISSION_GRANTED) {
                    permissions.add(Manifest.permission.ACCESS_COARSE_LOCATION); permissions.add(Manifest.permission.ACCESS_FINE_LOCATION);
                }
                if (Build.VERSION.SDK_INT >= 33 && checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED) permissions.add(Manifest.permission.POST_NOTIFICATIONS);
                if (permissions.isEmpty()) launchTracking();
                else { permissionPending = true; requestPermissions(permissions.toArray(new String[0]), 10); }
            }).show();
    }
    private void status(String message) { getSharedPreferences("tracking-status", 0).edit().putString("message", message).apply(); Toast.makeText(this, message, Toast.LENGTH_LONG).show(); }
    private void launchTracking() {
        if (!visible) { status("Buka aplikasi untuk mengaktifkan GPS."); return; }
        try { startForegroundService(new Intent(this, TrackingService.class)); }
        catch (Exception error) { status("GPS gagal dimulai. Periksa izin lokasi dan buka aplikasi kembali."); }
    }
    @Override public void onRequestPermissionsResult(int code, String[] permissions, int[] results) {
        super.onRequestPermissionsResult(code, permissions, results);
        boolean location = checkSelfPermission(Manifest.permission.ACCESS_FINE_LOCATION) == PackageManager.PERMISSION_GRANTED;
        if (code == 20 && geoCallback != null) { geoCallback.invoke(geoOrigin, location, false); geoCallback = null; }
        if (code == 10) {
            permissionPending = false;
            boolean notifications = Build.VERSION.SDK_INT < 33 || checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS) == PackageManager.PERMISSION_GRANTED;
            if (location && notifications) launchTracking(); else status("KM tersimpan, tetapi GPS belum aktif. Izinkan lokasi presisi dan notifikasi di pengaturan aplikasi.");
        }
    }
    @Override public void onBackPressed() { if (web.canGoBack()) web.goBack(); else super.onBackPressed(); }
    @Override public void onResume() { super.onResume(); visible = true; }
    @Override public void onPause() { visible = false; CookieManager.getInstance().flush(); super.onPause(); }
    @Override public void onDestroy() { finishFile(null); main.removeCallbacksAndMessages(null); worker.shutdown(); web.destroy(); super.onDestroy(); }
}
