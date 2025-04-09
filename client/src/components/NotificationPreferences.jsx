import React, { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "../components/ui/button";
import { Label } from "../components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";
import { Switch } from "../components/ui/switch";
import api from "../utils/api";

const NotificationPreferences = () => {
  const [preferences, setPreferences] = useState({
    email: {
      enabled: true,
      digest: "immediate",
      types: ["urgent", "high", "medium"],
    },
    push: {
      enabled: true,
      quiet_hours: {
        enabled: false,
        start: "22:00",
        end: "07:00",
      },
      types: ["urgent", "high"],
    },
    inApp: {
      enabled: true,
      types: ["all"],
    },
  });

  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    fetchPreferences();
  }, []);

  const fetchPreferences = async () => {
    try {
      const response = await api.get("/notifications/preferences");
      if (response.data?.success) {
        setPreferences(response.data.preferences);
      }
    } catch (error) {
      console.error("Failed to fetch notification preferences:", error);
      toast.error("Failed to load notification preferences");
    }
  };

  const savePreferences = async () => {
    setIsLoading(true);
    try {
      const response = await api.put("/notifications/preferences", preferences);
      if (response.data?.success) {
        toast.success("Notification preferences saved successfully");
      }
    } catch (error) {
      console.error("Failed to save notification preferences:", error);
      toast.error("Failed to save notification preferences");
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggle = (section, field) => {
    setPreferences((prev) => ({
      ...prev,
      [section]: {
        ...prev[section],
        [field]: !prev[section][field],
      },
    }));
  };

  const handleQuietHoursToggle = (enabled) => {
    setPreferences((prev) => ({
      ...prev,
      push: {
        ...prev.push,
        quiet_hours: {
          ...prev.push.quiet_hours,
          enabled,
        },
      },
    }));
  };

  const handleTimeChange = (field, value) => {
    setPreferences((prev) => ({
      ...prev,
      push: {
        ...prev.push,
        quiet_hours: {
          ...prev.push.quiet_hours,
          [field]: value,
        },
      },
    }));
  };

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <h2 className="text-lg font-semibold">Email Notifications</h2>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Label htmlFor="email-enabled">Enable Email Notifications</Label>
            <Switch
              id="email-enabled"
              checked={preferences.email.enabled}
              onCheckedChange={() => handleToggle("email", "enabled")}
            />
          </div>
          <div className="space-y-2">
            <Label>Email Digest Frequency</Label>
            <Select
              value={preferences.email.digest}
              onValueChange={(value) =>
                setPreferences((prev) => ({
                  ...prev,
                  email: { ...prev.email, digest: value },
                }))
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Select frequency" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="immediate">Immediate</SelectItem>
                <SelectItem value="daily">Daily</SelectItem>
                <SelectItem value="weekly">Weekly</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <h2 className="text-lg font-semibold">Push Notifications</h2>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Label htmlFor="push-enabled">Enable Push Notifications</Label>
            <Switch
              id="push-enabled"
              checked={preferences.push.enabled}
              onCheckedChange={() => handleToggle("push", "enabled")}
            />
          </div>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label htmlFor="quiet-hours">Enable Quiet Hours</Label>
              <Switch
                id="quiet-hours"
                checked={preferences.push.quiet_hours.enabled}
                onCheckedChange={handleQuietHoursToggle}
              />
            </div>
            {preferences.push.quiet_hours.enabled && (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Start Time</Label>
                  <input
                    type="time"
                    value={preferences.push.quiet_hours.start}
                    onChange={(e) => handleTimeChange("start", e.target.value)}
                    className="w-full rounded-md border border-gray-300 p-2"
                  />
                </div>
                <div className="space-y-2">
                  <Label>End Time</Label>
                  <input
                    type="time"
                    value={preferences.push.quiet_hours.end}
                    onChange={(e) => handleTimeChange("end", e.target.value)}
                    className="w-full rounded-md border border-gray-300 p-2"
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <h2 className="text-lg font-semibold">In-App Notifications</h2>
        <div className="flex items-center justify-between">
          <Label htmlFor="inapp-enabled">Enable In-App Notifications</Label>
          <Switch
            id="inapp-enabled"
            checked={preferences.inApp.enabled}
            onCheckedChange={() => handleToggle("inApp", "enabled")}
          />
        </div>
      </div>

      <div className="flex justify-end">
        <Button onClick={savePreferences} disabled={isLoading}>
          {isLoading ? "Saving..." : "Save Preferences"}
        </Button>
      </div>
    </div>
  );
};

export default NotificationPreferences;
