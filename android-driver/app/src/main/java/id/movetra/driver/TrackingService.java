package id.movetra.driver;

import android.Manifest;
import android.app.*;
import android.content.*;
import android.content.pm.PackageManager;
import android.content.pm.ServiceInfo;
import android.location.*;
import android.net.*;
import android.os.*;
import java.time.Instant;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.concurrent.*;
import org.json.JSONObject;

public final class TrackingService extends Service implements LocationListener {
    static final String STOP = "id.movetra.driver.STOP";
    static volatile boolean running;
    private static final int NOTIFICATION = 41;
    private final Handler main = new Handler(Looper.getMainLooper());
    private final ScheduledExecutorService worker = Executors.newSingleThreadScheduledExecutor();
    private volatile boolean stopped;
    private volatile String trip;
    private String owner;
    private PointQueue queue;
    private Backend backend;
    private LocationManager locations;
    private ConnectivityManager connectivity;
    private long lastCapturedElapsed;
    private long verifiedAt;
    private boolean listening;
    private final ConnectivityManager.NetworkCallback network = new ConnectivityManager.NetworkCallback() {
        @Override public void onAvailable(Network network) { scheduleTick(); }
    };
    private void scheduleTick() { if (!stopped && !worker.isShutdown()) try { worker.execute(this::tick); } catch (RejectedExecutionException ignored) { } }
    @Override public void onCreate() {
        super.onCreate();
        queue = new PointQueue(this); backend = Backend.get(this);
        locations = getSystemService(LocationManager.class);
        connectivity = getSystemService(ConnectivityManager.class);
        getSystemService(NotificationManager.class).createNotificationChannel(new NotificationChannel("tracking", "Tracking perjalanan", NotificationManager.IMPORTANCE_LOW));
    }
    @Override public int onStartCommand(Intent intent, int flags, int startId) {
        if (intent == null || STOP.equals(intent.getAction())) { finish("Tracking dihentikan. Antrean tersimpan untuk perjalanan yang sama."); return START_NOT_STICKY; }
        if (running) return START_NOT_STICKY;
        if (checkSelfPermission(Manifest.permission.ACCESS_FINE_LOCATION) != PackageManager.PERMISSION_GRANTED) {
            finish("Izinkan lokasi presisi untuk memulai GPS."); return START_NOT_STICKY;
        }
        try {
            if (Build.VERSION.SDK_INT >= 29) startForeground(NOTIFICATION, notification("Memeriksa perjalanan…"), ServiceInfo.FOREGROUND_SERVICE_TYPE_LOCATION);
            else startForeground(NOTIFICATION, notification("Memeriksa perjalanan…"));
            running = true;
            status("Memeriksa perjalanan…");
            connectivity.registerDefaultNetworkCallback(network);
            worker.scheduleWithFixedDelay(this::tick, 0, 30, TimeUnit.SECONDS);
        } catch (Exception error) { finish("Layanan GPS tidak dapat dimulai. Buka aplikasi dan periksa izin lokasi."); }
        return START_NOT_STICKY;
    }
    private Notification notification(String text) {
        PendingIntent open = PendingIntent.getActivity(this, 0, new Intent(this, MainActivity.class), PendingIntent.FLAG_IMMUTABLE | PendingIntent.FLAG_UPDATE_CURRENT);
        PendingIntent stop = PendingIntent.getService(this, 1, new Intent(this, TrackingService.class).setAction(STOP), PendingIntent.FLAG_IMMUTABLE | PendingIntent.FLAG_UPDATE_CURRENT);
        return new Notification.Builder(this, "tracking").setSmallIcon(R.drawable.ic_tracking)
            .setContentTitle("Movetra • GPS perjalanan").setContentText(text).setContentIntent(open)
            .setStyle(new Notification.BigTextStyle().bigText(text)).setOngoing(true)
            .addAction(new Notification.Action.Builder(null, "Hentikan GPS", stop).build()).build();
    }
    private void status(String value) {
        getSharedPreferences("tracking-status", 0).edit().putString("message", value).apply();
        if (running && !stopped) getSystemService(NotificationManager.class).notify(NOTIFICATION, notification(value));
    }
    private void tick() {
        if (stopped) return;
        if (checkSelfPermission(Manifest.permission.ACCESS_FINE_LOCATION) != PackageManager.PERMISSION_GRANTED) {
            finish("Izin lokasi dicabut. GPS dihentikan."); return;
        }
        PowerManager.WakeLock wake = getSystemService(PowerManager.class).newWakeLock(PowerManager.PARTIAL_WAKE_LOCK, "Movetra:upload");
        wake.acquire(120_000);
        try {
            String active = backend.activeTrip();
            if (stopped) return;
            verifiedAt = SystemClock.elapsedRealtime();
            if (active == null) {
                queue.clear();
                finish(trip == null ? "Belum ada perjalanan aktif. Simpan KM awal di situs, lalu aktifkan GPS." : "Perjalanan selesai. GPS dihentikan; antrean yang belum terkirim dihapus karena perjalanan sudah ditutup."); return;
            }
            if (trip != null && !trip.equals(active)) { finish("Perjalanan berubah. Aktifkan GPS kembali untuk perjalanan baru."); return; }
            if (trip == null) {
                owner = backend.userId(); trip = active;
                int removed = queue.retain(owner, trip);
                if (removed > 0) getSharedPreferences("tracking-status", 0).edit().putString("notice", removed + " titik lama/beda perjalanan dihapus.").apply();
                main.post(this::startLocations);
            }
            // Bound one upload pass so stop, connectivity events and new points remain responsive.
            for (int i = 0; i < 30 && !stopped; i++) {
                JSONObject point = queue.first(owner, trip);
                if (point == null) break;
                try { backend.send(point); }
                catch (Backend.Failure failure) {
                    if ("22023".equals(failure.code) || "23514".equals(failure.code)) {
                        queue.remove(point.getString("p_id"));
                        getSharedPreferences("tracking-status", 0).edit().putString("notice", "Titik dengan waktu/koordinat yang ditolak server dihapus.").apply();
                        continue;
                    }
                    throw failure;
                }
                queue.remove(point.getString("p_id"));
                String time = DateTimeFormatter.ofPattern("HH:mm:ss").withZone(ZoneId.of("Asia/Jakarta")).format(Instant.now());
                getSharedPreferences("tracking-status", 0).edit().putString("last_sent", time + " WIB").apply();
            }
            if (!stopped) status("Tracking aktif • antrean " + queue.count() + " titik. Terakhir kirim: " + getSharedPreferences("tracking-status", 0).getString("last_sent", "menunggu lokasi"));
        } catch (Backend.Failure failure) {
            if (failure.denied()) finish("GPS dihentikan: sesi, akun, atau perjalanan tidak diizinkan. Periksa akun lalu coba kembali.");
            else offline();
        } catch (Exception error) { offline(); }
        finally { if (wake.isHeld()) wake.release(); }
    }
    private void offline() {
        if (stopped) return;
        if (trip == null) { finish("Tidak dapat memeriksa perjalanan. Sambungkan internet lalu aktifkan GPS kembali."); return; }
        if (SystemClock.elapsedRealtime() - verifiedAt >= TrackingRules.MAX_AGE_MS) {
            finish("Server tidak dapat diverifikasi selama 24 jam. Buka aplikasi untuk memulai ulang."); return;
        }
        status("Belum tersambung ke server • " + queue.count() + " titik tersimpan di HP.");
    }
    @android.annotation.SuppressLint("MissingPermission")
    private void startLocations() {
        if (stopped || listening) return;
        if (checkSelfPermission(Manifest.permission.ACCESS_FINE_LOCATION) != PackageManager.PERMISSION_GRANTED) { finish("Izin lokasi dicabut. GPS dihentikan."); return; }
        try {
            for (String provider : new String[] { LocationManager.GPS_PROVIDER, LocationManager.NETWORK_PROVIDER }) {
                if (locations.isProviderEnabled(provider)) {
                    locations.requestLocationUpdates(provider, TrackingRules.INTERVAL_MS, 0, this, Looper.getMainLooper());
                    listening = true;
                }
            }
            if (!listening) finish("Lokasi HP belum aktif. Nyalakan lokasi dan aktifkan GPS kembali.");
        } catch (Exception error) { finish("GPS tidak tersedia. Periksa izin dan pengaturan lokasi HP."); }
    }
    @Override public void onLocationChanged(Location location) {
        if (stopped || trip == null || !location.hasAccuracy()) return;
        long elapsed = SystemClock.elapsedRealtime();
        if (lastCapturedElapsed != 0 && elapsed - lastCapturedElapsed < TrackingRules.INTERVAL_MS) return;
        // Do not turn stale cached fixes into fresh tracking points.
        if (elapsed - location.getElapsedRealtimeNanos() / 1_000_000 > 120_000 ||
            !TrackingRules.validLocation(location.getLatitude(), location.getLongitude(), location.getAccuracy(), location.getTime(), System.currentTimeMillis())) return;
        lastCapturedElapsed = elapsed;
        try {
            int removed = queue.add(owner, trip, location);
            if (removed > 0) getSharedPreferences("tracking-status", 0).edit().putString("notice", removed + " titik kedaluwarsa/antrean penuh dihapus.").apply();
            scheduleTick();
        } catch (Exception error) { finish("Penyimpanan lokasi gagal. Periksa ruang penyimpanan HP."); }
    }
    @Override public void onProviderDisabled(String provider) { status("Sinyal/lokasi GPS tidak tersedia. Periksa pengaturan lokasi HP."); }
    @Override public void onProviderEnabled(String provider) { }
    @Override public void onStatusChanged(String provider, int value, Bundle extras) { }
    private void finish(String message) {
        stopped = true; running = false; status(message);
        main.post(() -> { if (locations != null) locations.removeUpdates(this); stopForeground(STOP_FOREGROUND_REMOVE); stopSelf(); });
    }
    @Override public void onDestroy() {
        stopped = true; running = false;
        main.removeCallbacksAndMessages(null);
        if (locations != null) locations.removeUpdates(this);
        try { connectivity.unregisterNetworkCallback(network); } catch (Exception ignored) { }
        // Close only after the in-flight upload has unwound; stopped tasks exit immediately.
        worker.execute(queue::close);
        worker.shutdown();
        super.onDestroy();
    }
    @Override public IBinder onBind(Intent intent) { return null; }
}
