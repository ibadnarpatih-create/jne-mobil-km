package id.movetra.driver;

import java.util.Locale;

final class TrackingRules {
    static final long INTERVAL_MS = 30_000;
    static final long MAX_AGE_MS = 24 * 60 * 60 * 1000L;
    static final int MAX_POINTS = 2880;
    static String[] loginEmails(String input) {
        String value = input.trim();
        if (value.contains("@")) return new String[] { value };
        String id = value.toUpperCase(Locale.ROOT).replaceAll("[^A-Z0-9._-]", "").toLowerCase(Locale.ROOT);
        String phone = value.startsWith("0") ? "+62" + value.substring(1) : value;
        phone = phone.replaceAll("\\D", "");
        return phone.isEmpty() ? new String[] { id + "@user.movetra.local" } :
            new String[] { id + "@user.movetra.local", phone + "@driver.jne.local" };
    }
    static boolean validLocation(double lat, double lng, float accuracy, long timestamp, long now) {
        return Double.isFinite(lat) && Double.isFinite(lng) && Float.isFinite(accuracy) &&
            lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180 && accuracy >= 0 && accuracy < 100000 &&
            timestamp > now - MAX_AGE_MS && timestamp <= now + 60_000;
    }
}
