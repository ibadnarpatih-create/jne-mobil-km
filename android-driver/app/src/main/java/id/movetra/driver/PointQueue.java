package id.movetra.driver;

import android.content.Context;
import android.content.ContentValues;
import android.database.Cursor;
import android.database.sqlite.SQLiteDatabase;
import android.database.sqlite.SQLiteOpenHelper;
import android.location.Location;
import java.time.Instant;
import java.util.UUID;
import org.json.JSONObject;

final class PointQueue extends SQLiteOpenHelper {
    PointQueue(Context context) { super(context, "tracking.db", null, 1); }
    @Override public void onCreate(SQLiteDatabase db) {
        db.execSQL("CREATE TABLE points (id TEXT PRIMARY KEY, owner TEXT NOT NULL, trip TEXT NOT NULL, captured INTEGER NOT NULL, payload TEXT NOT NULL)");
        db.execSQL("CREATE INDEX queue_time ON points(captured)");
    }
    @Override public void onUpgrade(SQLiteDatabase db, int oldVersion, int newVersion) { }
    synchronized int add(String owner, String trip, Location location) throws Exception {
        SQLiteDatabase db = getWritableDatabase();
        db.beginTransaction();
        try {
            int removed = db.delete("points", "captured < ?", new String[] { Long.toString(System.currentTimeMillis() - TrackingRules.MAX_AGE_MS) });
            if (count() >= TrackingRules.MAX_POINTS) {
                db.execSQL("DELETE FROM points WHERE id IN (SELECT id FROM points ORDER BY captured LIMIT 1)");
                removed++;
            }
            String id = UUID.randomUUID().toString();
            JSONObject payload = new JSONObject().put("p_id", id).put("p_log_id", trip)
                .put("p_latitude", location.getLatitude()).put("p_longitude", location.getLongitude())
                .put("p_accuracy", location.getAccuracy()).put("p_recorded_at", Instant.ofEpochMilli(location.getTime()).toString());
            ContentValues values = new ContentValues();
            values.put("id", id); values.put("owner", owner); values.put("trip", trip);
            values.put("captured", location.getTime()); values.put("payload", payload.toString());
            db.insertOrThrow("points", null, values);
            db.setTransactionSuccessful(); return removed;
        } finally { db.endTransaction(); }
    }
    synchronized JSONObject first(String owner, String trip) throws Exception {
        try (Cursor cursor = getReadableDatabase().query("points", new String[] { "payload" }, "owner = ? AND trip = ?", new String[] { owner, trip }, null, null, "captured ASC", "1")) {
            return cursor.moveToFirst() ? new JSONObject(cursor.getString(0)) : null;
        }
    }
    synchronized void remove(String id) { getWritableDatabase().delete("points", "id = ?", new String[] { id }); }
    synchronized int retain(String owner, String trip) {
        return getWritableDatabase().delete("points", "owner <> ? OR trip <> ? OR captured < ?", new String[] { owner, trip, Long.toString(System.currentTimeMillis() - TrackingRules.MAX_AGE_MS) });
    }
    synchronized int count() {
        try (Cursor cursor = getReadableDatabase().rawQuery("SELECT count(*) FROM points", null)) { cursor.moveToFirst(); return cursor.getInt(0); }
    }
    synchronized void clear() { getWritableDatabase().delete("points", null, null); }
}
