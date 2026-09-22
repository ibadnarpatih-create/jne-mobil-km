package id.movetra.driver;

import org.junit.Test;
import static org.junit.Assert.*;

public class TrackingRulesTest {
    @Test public void existingLoginFormatsRemainCompatible() {
        assertArrayEquals(new String[] { "drv-01@user.movetra.local", "01@driver.jne.local" }, TrackingRules.loginEmails(" DRV-01 "));
        assertArrayEquals(new String[] { "081234@user.movetra.local", "6281234@driver.jne.local" }, TrackingRules.loginEmails("081234"));
        assertArrayEquals(new String[] { "driver@example.com" }, TrackingRules.loginEmails("driver@example.com"));
    }
    @Test public void malformedLocationsNeverReachUploadQueue() {
        long now = 1_800_000_000_000L;
        assertTrue(TrackingRules.validLocation(-6.2, 106.8, 12, now, now));
        assertFalse(TrackingRules.validLocation(Double.NaN, 106.8, 12, now, now));
        assertFalse(TrackingRules.validLocation(-91, 106.8, 12, now, now));
        assertFalse(TrackingRules.validLocation(-6.2, 181, 12, now, now));
        assertFalse(TrackingRules.validLocation(-6.2, 106.8, Float.NaN, now, now));
        assertFalse(TrackingRules.validLocation(-6.2, 106.8, -1, now, now));
    }
    @Test public void expiredAndFutureFixesAreRejected() {
        long now = 1_800_000_000_000L;
        assertFalse(TrackingRules.validLocation(0, 0, 10, now - TrackingRules.MAX_AGE_MS, now));
        assertFalse(TrackingRules.validLocation(0, 0, 10, now + 60_001, now));
        assertTrue(TrackingRules.validLocation(0, 0, 10, now - 30_000, now));
    }
}
