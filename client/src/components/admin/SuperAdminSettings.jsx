import {
  AlertTriangle,
  Check,
  Database,
  Download,
  RefreshCw,
  ServerCrash,
  Shield,
  Trash2,
  UploadCloud,
  Users,
} from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { api } from "../../lib/api";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "../ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import { Separator } from "../ui/separator";
import { Slider } from "../ui/slider";
import { Switch } from "../ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";

const SuperAdminSettings = () => {
  const [systemInfo, setSystemInfo] = useState({
    version: "1.0.0",
    uptime: "10 days, 4 hours",
    nodejs: "v18.18.0",
    database: "MongoDB 6.0.11",
    os: "Linux 5.15.0",
    cpu: "45%",
    memory: "62%",
    disk: "38%",
    lastBackup: "2025-04-07T14:30:00Z",
    backupSchedule: "Daily at 02:00 UTC",
  });

  const [adminUsers, setAdminUsers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showNewAdminDialog, setShowNewAdminDialog] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [actionToConfirm, setActionToConfirm] = useState(null);
  const [loadingAction, setLoadingAction] = useState(null);
  const [showBackupDialog, setShowBackupDialog] = useState(false);

  const [newAdmin, setNewAdmin] = useState({
    email: "",
    fullName: "",
    password: "",
    role: "admin",
  });

  const [settings, setSettings] = useState({
    // Security Settings
    requireMFA: true,
    sessionTimeout: 60,
    minPasswordLength: 8,
    passwordComplexity: "medium",
    ipRestriction: false,
    allowedIPs: "",

    // Email Settings
    smtpServer: "smtp.example.com",
    smtpPort: 587,
    smtpSecurity: "tls",
    emailFrom: "noreply@example.com",
    emailReplyTo: "support@example.com",

    // System Settings
    maxFileUploadSize: 10,
    maxStoragePerTeam: 500,
    backupFrequency: "daily",
    loggingLevel: "info",
    maintenanceMode: false,

    // Registration Settings
    allowSupervisorRegistration: true,
    allowStudentRegistration: true,
    requireEmailVerification: true,
    autoApproveStudents: true,
    autoApproveSupervisors: false,
    restrictDomains: false,
    allowedDomains: "",
  });

  const [selectedAdminId, setSelectedAdminId] = useState(null);

  useEffect(() => {
    fetchAdminUsers();
    fetchSystemInfo();
    fetchSettings();
  }, []);

  const fetchAdminUsers = async () => {
    setIsLoading(true);
    try {
      const response = await api.get("/api/users/admins");
      setAdminUsers(response.data.data || []);
    } catch (error) {
      console.error("Failed to fetch admin users:", error);
      toast.error("Could not load admin users");
    } finally {
      setIsLoading(false);
    }
  };

  const fetchSystemInfo = async () => {
    try {
      const response = await api.get("/api/system/info");
      setSystemInfo(response.data.data || systemInfo);
    } catch (error) {
      console.error("Failed to fetch system info:", error);
      // Keep using the default values
    }
  };

  const fetchSettings = async () => {
    try {
      const response = await api.get("/api/system/settings");
      setSettings(response.data.data || settings);
    } catch (error) {
      console.error("Failed to fetch system settings:", error);
      // Keep using the default values
    }
  };

  const handleSettingChange = (category, setting, value) => {
    setSettings((prev) => ({
      ...prev,
      [setting]: value,
    }));
  };

  const saveSettings = async (category) => {
    setLoadingAction("save-" + category);
    try {
      // In a real app, you'd only send the relevant category settings
      // For simplicity, we're sending all settings here
      await api.put("/api/system/settings", { settings });
      toast.success(`${capitalize(category)} settings saved successfully`);
    } catch (error) {
      console.error(`Failed to save ${category} settings:`, error);
      toast.error(`Could not save ${category} settings`);
    } finally {
      setLoadingAction(null);
    }
  };

  const createNewAdmin = async () => {
    setLoadingAction("create-admin");
    try {
      if (!newAdmin.email || !newAdmin.fullName || !newAdmin.password) {
        toast.error("Please fill in all required fields");
        return;
      }

      await api.post("/api/users/create-admin", newAdmin);
      toast.success("New admin user created successfully");
      setShowNewAdminDialog(false);
      fetchAdminUsers();

      // Reset form
      setNewAdmin({
        email: "",
        fullName: "",
        password: "",
        role: "admin",
      });
    } catch (error) {
      console.error("Failed to create admin user:", error);
      toast.error(
        error.response?.data?.message || "Could not create admin user"
      );
    } finally {
      setLoadingAction(null);
    }
  };

  const handleAdminStatusChange = async (adminId, active) => {
    try {
      await api.put(`/api/users/${adminId}/status`, { active });

      // Update local state
      setAdminUsers((prevAdmins) =>
        prevAdmins.map((admin) =>
          admin._id === adminId ? { ...admin, active } : admin
        )
      );

      toast.success(
        `Admin ${active ? "activated" : "deactivated"} successfully`
      );
    } catch (error) {
      console.error("Failed to update admin status:", error);
      toast.error("Could not update admin status");
    }
  };

  const confirmAction = (action, adminId = null) => {
    setActionToConfirm(action);
    setSelectedAdminId(adminId);
    setShowConfirmDialog(true);
  };

  const executeConfirmedAction = async () => {
    setLoadingAction(actionToConfirm);

    try {
      switch (actionToConfirm) {
        case "delete-admin":
          await api.delete(`/api/users/${selectedAdminId}`);
          setAdminUsers((prevAdmins) =>
            prevAdmins.filter((admin) => admin._id !== selectedAdminId)
          );
          toast.success("Admin user deleted successfully");
          break;

        case "clear-logs":
          await api.post("/api/system/logs/clear");
          toast.success("System logs cleared successfully");
          break;

        case "reset-sessions":
          await api.post("/api/system/sessions/reset");
          toast.success("All user sessions have been reset");
          break;

        case "system-backup":
          await api.post("/api/system/backup");
          toast.success("System backup initiated successfully");
          fetchSystemInfo(); // Refresh system info to get latest backup time
          break;

        default:
          console.error("Unknown action:", actionToConfirm);
      }
    } catch (error) {
      console.error(`Failed to execute ${actionToConfirm}:`, error);
      toast.error(
        `Action failed: ${error.response?.data?.message || "Unknown error"}`
      );
    } finally {
      setLoadingAction(null);
      setShowConfirmDialog(false);
      setActionToConfirm(null);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return "Never";

    const date = new Date(dateString);
    return date.toLocaleString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const capitalize = (str) => {
    return str.charAt(0).toUpperCase() + str.slice(1);
  };

  const SystemInfoPanel = () => (
    <Card>
      <CardHeader>
        <CardTitle>System Information</CardTitle>
        <CardDescription>Current system status and information</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-medium mb-2">Software</h3>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-500">Application Version:</span>
                  <span className="font-medium">{systemInfo.version}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Node.js:</span>
                  <span className="font-medium">{systemInfo.nodejs}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Database:</span>
                  <span className="font-medium">{systemInfo.database}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Operating System:</span>
                  <span className="font-medium">{systemInfo.os}</span>
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-lg font-medium mb-2">Status</h3>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-500">Uptime:</span>
                  <span className="font-medium">{systemInfo.uptime}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Last Backup:</span>
                  <span className="font-medium">
                    {formatDate(systemInfo.lastBackup)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Backup Schedule:</span>
                  <span className="font-medium">
                    {systemInfo.backupSchedule}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-medium mb-2">System Resources</h3>
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between mb-1">
                    <span className="text-gray-500">CPU Usage:</span>
                    <span className="font-medium">{systemInfo.cpu}</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2.5 dark:bg-gray-700">
                    <div
                      className="bg-blue-600 h-2.5 rounded-full"
                      style={{ width: systemInfo.cpu }}
                    ></div>
                  </div>
                </div>

                <div>
                  <div className="flex justify-between mb-1">
                    <span className="text-gray-500">Memory Usage:</span>
                    <span className="font-medium">{systemInfo.memory}</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2.5 dark:bg-gray-700">
                    <div
                      className="bg-green-600 h-2.5 rounded-full"
                      style={{ width: systemInfo.memory }}
                    ></div>
                  </div>
                </div>

                <div>
                  <div className="flex justify-between mb-1">
                    <span className="text-gray-500">Disk Usage:</span>
                    <span className="font-medium">{systemInfo.disk}</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2.5 dark:bg-gray-700">
                    <div
                      className="bg-amber-600 h-2.5 rounded-full"
                      style={{ width: systemInfo.disk }}
                    ></div>
                  </div>
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-lg font-medium mb-2">Actions</h3>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  variant="outline"
                  className="flex items-center gap-2"
                  onClick={() => confirmAction("system-backup")}
                >
                  <UploadCloud className="h-4 w-4" />
                  <span>Backup Now</span>
                </Button>

                <Button
                  variant="outline"
                  className="flex items-center gap-2"
                  onClick={() => setShowBackupDialog(true)}
                >
                  <Download className="h-4 w-4" />
                  <span>Download Backup</span>
                </Button>

                <Button
                  variant="outline"
                  className="flex items-center gap-2"
                  onClick={() => confirmAction("clear-logs")}
                >
                  <Trash2 className="h-4 w-4" />
                  <span>Clear Logs</span>
                </Button>

                <Button
                  variant="outline"
                  className="flex items-center gap-2"
                  onClick={() => confirmAction("reset-sessions")}
                >
                  <RefreshCw className="h-4 w-4" />
                  <span>Reset Sessions</span>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
      <CardFooter className="flex justify-between">
        <Button
          variant="outline"
          className="flex items-center gap-2"
          onClick={fetchSystemInfo}
        >
          <RefreshCw className="h-4 w-4" />
          <span>Refresh</span>
        </Button>

        <Button
          variant={settings.maintenanceMode ? "destructive" : "outline"}
          className="flex items-center gap-2"
          onClick={() =>
            handleSettingChange(
              "system",
              "maintenanceMode",
              !settings.maintenanceMode
            )
          }
        >
          {settings.maintenanceMode ? (
            <>
              <ServerCrash className="h-4 w-4" />
              <span>Disable Maintenance Mode</span>
            </>
          ) : (
            <>
              <AlertTriangle className="h-4 w-4" />
              <span>Enable Maintenance Mode</span>
            </>
          )}
        </Button>
      </CardFooter>
    </Card>
  );

  const AdminUsersPanel = () => (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Administrator Management</CardTitle>
            <CardDescription>Manage admin and superadmin users</CardDescription>
          </div>
          <Button
            className="flex items-center gap-2"
            onClick={() => setShowNewAdminDialog(true)}
          >
            <Users className="h-4 w-4" />
            <span>Create Admin</span>
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center items-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
          </div>
        ) : adminUsers.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No admin users found</p>
            <p className="text-sm">Create your first admin user</p>
          </div>
        ) : (
          <div className="rounded-md border">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    Name
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    Email
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    Role
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    Status
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {adminUsers.map((admin) => (
                  <tr key={admin._id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="font-medium">{admin.fullName}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-500">{admin.email}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Badge
                        className={
                          admin.role === "superadmin"
                            ? "bg-amber-100 text-amber-800 hover:bg-amber-100"
                            : "bg-blue-100 text-blue-800 hover:bg-blue-100"
                        }
                      >
                        {admin.role === "superadmin" ? "Super Admin" : "Admin"}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <Switch
                          checked={admin.active !== false}
                          onCheckedChange={(checked) =>
                            handleAdminStatusChange(admin._id, checked)
                          }
                          disabled={admin.role === "superadmin"} // Can't deactivate superadmins
                        />
                        <Label className="ml-2">
                          {admin.active !== false ? "Active" : "Inactive"}
                        </Label>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-red-500 hover:text-red-700"
                        onClick={() => confirmAction("delete-admin", admin._id)}
                        disabled={admin.role === "superadmin"} // Can't delete superadmins through UI
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );

  const renderSettingFields = (category) => {
    switch (category) {
      case "security":
        return (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="requireMFA">Require MFA</Label>
                <p className="text-sm text-gray-500">
                  Require multi-factor authentication for all admin users
                </p>
              </div>
              <Switch
                id="requireMFA"
                checked={settings.requireMFA}
                onCheckedChange={(checked) =>
                  handleSettingChange("security", "requireMFA", checked)
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="sessionTimeout">Session Timeout (minutes)</Label>
              <div className="flex gap-2">
                <Slider
                  id="sessionTimeout"
                  min={15}
                  max={240}
                  step={15}
                  value={[settings.sessionTimeout]}
                  onValueChange={([value]) =>
                    handleSettingChange("security", "sessionTimeout", value)
                  }
                  className="flex-1"
                />
                <div className="w-12 text-center">
                  {settings.sessionTimeout}
                </div>
              </div>
              <p className="text-sm text-gray-500">
                Time before users are automatically logged out due to inactivity
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="minPasswordLength">Minimum Password Length</Label>
              <div className="flex gap-2">
                <Slider
                  id="minPasswordLength"
                  min={6}
                  max={16}
                  step={1}
                  value={[settings.minPasswordLength]}
                  onValueChange={([value]) =>
                    handleSettingChange("security", "minPasswordLength", value)
                  }
                  className="flex-1"
                />
                <div className="w-12 text-center">
                  {settings.minPasswordLength}
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="passwordComplexity">Password Complexity</Label>
              <Select
                id="passwordComplexity"
                value={settings.passwordComplexity}
                onValueChange={(value) =>
                  handleSettingChange("security", "passwordComplexity", value)
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select complexity" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low (letters only)</SelectItem>
                  <SelectItem value="medium">
                    Medium (letters & numbers)
                  </SelectItem>
                  <SelectItem value="high">
                    High (letters, numbers & symbols)
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="ipRestriction">IP Restriction</Label>
                  <p className="text-sm text-gray-500">
                    Restrict admin access to specific IP addresses
                  </p>
                </div>
                <Switch
                  id="ipRestriction"
                  checked={settings.ipRestriction}
                  onCheckedChange={(checked) =>
                    handleSettingChange("security", "ipRestriction", checked)
                  }
                />
              </div>

              {settings.ipRestriction && (
                <div className="pt-2">
                  <Label htmlFor="allowedIPs">Allowed IP Addresses</Label>
                  <Input
                    id="allowedIPs"
                    placeholder="Enter IP addresses separated by commas"
                    value={settings.allowedIPs}
                    onChange={(e) =>
                      handleSettingChange(
                        "security",
                        "allowedIPs",
                        e.target.value
                      )
                    }
                    className="mt-1"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Example: 192.168.1.1, 10.0.0.0/24
                  </p>
                </div>
              )}
            </div>
          </div>
        );

      case "email":
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="smtpServer">SMTP Server</Label>
                <Input
                  id="smtpServer"
                  placeholder="smtp.example.com"
                  value={settings.smtpServer}
                  onChange={(e) =>
                    handleSettingChange("email", "smtpServer", e.target.value)
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="smtpPort">SMTP Port</Label>
                <Input
                  id="smtpPort"
                  type="number"
                  placeholder="587"
                  value={settings.smtpPort}
                  onChange={(e) =>
                    handleSettingChange(
                      "email",
                      "smtpPort",
                      parseInt(e.target.value)
                    )
                  }
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="smtpSecurity">SMTP Security</Label>
              <Select
                id="smtpSecurity"
                value={settings.smtpSecurity}
                onValueChange={(value) =>
                  handleSettingChange("email", "smtpSecurity", value)
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select security protocol" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  <SelectItem value="ssl">SSL</SelectItem>
                  <SelectItem value="tls">TLS</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="emailFrom">From Email</Label>
                <Input
                  id="emailFrom"
                  placeholder="noreply@example.com"
                  value={settings.emailFrom}
                  onChange={(e) =>
                    handleSettingChange("email", "emailFrom", e.target.value)
                  }
                />
                <p className="text-xs text-gray-500">
                  The email address that will appear in the "From" field
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="emailReplyTo">Reply-To Email</Label>
                <Input
                  id="emailReplyTo"
                  placeholder="support@example.com"
                  value={settings.emailReplyTo}
                  onChange={(e) =>
                    handleSettingChange("email", "emailReplyTo", e.target.value)
                  }
                />
                <p className="text-xs text-gray-500">
                  The email address that will receive replies
                </p>
              </div>
            </div>

            <div className="pt-2">
              <Button
                className="flex items-center gap-2"
                variant="outline"
                onClick={() => {
                  // In a real app, this would send a test email
                  toast.success("Test email sent successfully!");
                }}
              >
                <Check className="h-4 w-4" />
                <span>Test Email Configuration</span>
              </Button>
            </div>
          </div>
        );

      case "registration":
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="allowStudentRegistration">
                      Student Registration
                    </Label>
                    <p className="text-sm text-gray-500">
                      Allow students to register accounts
                    </p>
                  </div>
                  <Switch
                    id="allowStudentRegistration"
                    checked={settings.allowStudentRegistration}
                    onCheckedChange={(checked) =>
                      handleSettingChange(
                        "registration",
                        "allowStudentRegistration",
                        checked
                      )
                    }
                  />
                </div>

                {settings.allowStudentRegistration && (
                  <div className="ml-6 mt-2 space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="autoApproveStudents">
                        Auto-approve Students
                      </Label>
                      <Switch
                        id="autoApproveStudents"
                        checked={settings.autoApproveStudents}
                        onCheckedChange={(checked) =>
                          handleSettingChange(
                            "registration",
                            "autoApproveStudents",
                            checked
                          )
                        }
                      />
                    </div>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="allowSupervisorRegistration">
                      Supervisor Registration
                    </Label>
                    <p className="text-sm text-gray-500">
                      Allow supervisors to register accounts
                    </p>
                  </div>
                  <Switch
                    id="allowSupervisorRegistration"
                    checked={settings.allowSupervisorRegistration}
                    onCheckedChange={(checked) =>
                      handleSettingChange(
                        "registration",
                        "allowSupervisorRegistration",
                        checked
                      )
                    }
                  />
                </div>

                {settings.allowSupervisorRegistration && (
                  <div className="ml-6 mt-2 space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="autoApproveSupervisors">
                        Auto-approve Supervisors
                      </Label>
                      <Switch
                        id="autoApproveSupervisors"
                        checked={settings.autoApproveSupervisors}
                        onCheckedChange={(checked) =>
                          handleSettingChange(
                            "registration",
                            "autoApproveSupervisors",
                            checked
                          )
                        }
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>

            <Separator />

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="requireEmailVerification">
                    Email Verification
                  </Label>
                  <p className="text-sm text-gray-500">
                    Require email verification before account activation
                  </p>
                </div>
                <Switch
                  id="requireEmailVerification"
                  checked={settings.requireEmailVerification}
                  onCheckedChange={(checked) =>
                    handleSettingChange(
                      "registration",
                      "requireEmailVerification",
                      checked
                    )
                  }
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="restrictDomains">Domain Restriction</Label>
                  <p className="text-sm text-gray-500">
                    Restrict registration to specific email domains
                  </p>
                </div>
                <Switch
                  id="restrictDomains"
                  checked={settings.restrictDomains}
                  onCheckedChange={(checked) =>
                    handleSettingChange(
                      "registration",
                      "restrictDomains",
                      checked
                    )
                  }
                />
              </div>

              {settings.restrictDomains && (
                <div className="pt-2">
                  <Label htmlFor="allowedDomains">Allowed Email Domains</Label>
                  <Input
                    id="allowedDomains"
                    placeholder="Enter domains separated by commas"
                    value={settings.allowedDomains}
                    onChange={(e) =>
                      handleSettingChange(
                        "registration",
                        "allowedDomains",
                        e.target.value
                      )
                    }
                    className="mt-1"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Example: example.edu, university.ac.uk
                  </p>
                </div>
              )}
            </div>
          </div>
        );

      case "system":
      default:
        return (
          <div className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="maxFileUploadSize">
                Max File Upload Size (MB)
              </Label>
              <div className="flex gap-2">
                <Slider
                  id="maxFileUploadSize"
                  min={1}
                  max={50}
                  step={1}
                  value={[settings.maxFileUploadSize]}
                  onValueChange={([value]) =>
                    handleSettingChange("system", "maxFileUploadSize", value)
                  }
                  className="flex-1"
                />
                <div className="w-12 text-center">
                  {settings.maxFileUploadSize} MB
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="maxStoragePerTeam">
                Max Storage Per Team (MB)
              </Label>
              <div className="flex gap-2">
                <Slider
                  id="maxStoragePerTeam"
                  min={100}
                  max={2000}
                  step={100}
                  value={[settings.maxStoragePerTeam]}
                  onValueChange={([value]) =>
                    handleSettingChange("system", "maxStoragePerTeam", value)
                  }
                  className="flex-1"
                />
                <div className="w-16 text-center">
                  {settings.maxStoragePerTeam} MB
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="backupFrequency">Backup Frequency</Label>
              <Select
                id="backupFrequency"
                value={settings.backupFrequency}
                onValueChange={(value) =>
                  handleSettingChange("system", "backupFrequency", value)
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select backup frequency" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="hourly">Hourly</SelectItem>
                  <SelectItem value="daily">Daily</SelectItem>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="loggingLevel">Logging Level</Label>
              <Select
                id="loggingLevel"
                value={settings.loggingLevel}
                onValueChange={(value) =>
                  handleSettingChange("system", "loggingLevel", value)
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select logging level" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="error">Error only</SelectItem>
                  <SelectItem value="warn">Warnings and errors</SelectItem>
                  <SelectItem value="info">Info and above</SelectItem>
                  <SelectItem value="debug">Debug (verbose)</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-gray-500">
                Higher logging levels may impact performance
              </p>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label
                    htmlFor="maintenanceMode"
                    className="text-red-600 font-medium"
                  >
                    Maintenance Mode
                  </Label>
                  <p className="text-sm text-gray-500">
                    Enable maintenance mode to temporarily disable access for
                    all non-admin users
                  </p>
                </div>
                <Switch
                  id="maintenanceMode"
                  checked={settings.maintenanceMode}
                  onCheckedChange={(checked) =>
                    handleSettingChange("system", "maintenanceMode", checked)
                  }
                />
              </div>

              {settings.maintenanceMode && (
                <div className="mt-2 p-3 bg-red-50 border border-red-200 rounded-md">
                  <p className="text-sm text-red-600 font-medium">
                    Warning: Maintenance mode is currently active
                  </p>
                  <p className="text-xs text-red-500 mt-1">
                    Only administrators can access the system. All other users
                    will see a maintenance message.
                  </p>
                </div>
              )}
            </div>
          </div>
        );
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="bg-amber-50">
          <div className="flex items-start space-x-4">
            <Shield className="h-10 w-10 text-amber-500" />
            <div>
              <CardTitle>Super Admin Settings</CardTitle>
              <CardDescription>
                Configure system-wide settings and manage administrators
              </CardDescription>
            </div>
          </div>
        </CardHeader>
      </Card>

      <Tabs defaultValue="admins">
        <TabsList className="grid grid-cols-2 md:grid-cols-5 mb-6">
          <TabsTrigger value="admins" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            <span>Admins</span>
          </TabsTrigger>
          <TabsTrigger value="system" className="flex items-center gap-2">
            <Database className="h-4 w-4" />
            <span>System</span>
          </TabsTrigger>
          <TabsTrigger value="security" className="flex items-center gap-2">
            <Shield className="h-4 w-4" />
            <span>Security</span>
          </TabsTrigger>
          <TabsTrigger value="email" className="flex items-center gap-2">
            <UploadCloud className="h-4 w-4" />
            <span>Email</span>
          </TabsTrigger>
          <TabsTrigger value="registration" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            <span>Registration</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="admins">
          <AdminUsersPanel />
        </TabsContent>

        <TabsContent value="system">
          <div className="space-y-6">
            <SystemInfoPanel />

            <Card>
              <CardHeader>
                <CardTitle>System Settings</CardTitle>
                <CardDescription>
                  Configure system-wide parameters and storage limits
                </CardDescription>
              </CardHeader>
              <CardContent>{renderSettingFields("system")}</CardContent>
              <CardFooter className="flex justify-end">
                <Button
                  className="flex items-center gap-2"
                  onClick={() => saveSettings("system")}
                  disabled={loadingAction === "save-system"}
                >
                  {loadingAction === "save-system" ? (
                    <>
                      <RefreshCw className="h-4 w-4 animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <>
                      <Check className="h-4 w-4" />
                      <span>Save System Settings</span>
                    </>
                  )}
                </Button>
              </CardFooter>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="security">
          <Card>
            <CardHeader>
              <CardTitle>Security Settings</CardTitle>
              <CardDescription>
                Configure security parameters and access controls
              </CardDescription>
            </CardHeader>
            <CardContent>{renderSettingFields("security")}</CardContent>
            <CardFooter className="flex justify-end">
              <Button
                className="flex items-center gap-2"
                onClick={() => saveSettings("security")}
                disabled={loadingAction === "save-security"}
              >
                {loadingAction === "save-security" ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <Check className="h-4 w-4" />
                    <span>Save Security Settings</span>
                  </>
                )}
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>

        <TabsContent value="email">
          <Card>
            <CardHeader>
              <CardTitle>Email Settings</CardTitle>
              <CardDescription>
                Configure email server settings and notifications
              </CardDescription>
            </CardHeader>
            <CardContent>{renderSettingFields("email")}</CardContent>
            <CardFooter className="flex justify-end">
              <Button
                className="flex items-center gap-2"
                onClick={() => saveSettings("email")}
                disabled={loadingAction === "save-email"}
              >
                {loadingAction === "save-email" ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <Check className="h-4 w-4" />
                    <span>Save Email Settings</span>
                  </>
                )}
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>

        <TabsContent value="registration">
          <Card>
            <CardHeader>
              <CardTitle>Registration Settings</CardTitle>
              <CardDescription>
                Configure user registration options and approvals
              </CardDescription>
            </CardHeader>
            <CardContent>{renderSettingFields("registration")}</CardContent>
            <CardFooter className="flex justify-end">
              <Button
                className="flex items-center gap-2"
                onClick={() => saveSettings("registration")}
                disabled={loadingAction === "save-registration"}
              >
                {loadingAction === "save-registration" ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <Check className="h-4 w-4" />
                    <span>Save Registration Settings</span>
                  </>
                )}
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Create New Admin Dialog */}
      <Dialog open={showNewAdminDialog} onOpenChange={setShowNewAdminDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Administrator</DialogTitle>
            <DialogDescription>
              Add a new admin user to the system
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="fullName">Full Name</Label>
              <Input
                id="fullName"
                placeholder="John Doe"
                value={newAdmin.fullName}
                onChange={(e) =>
                  setNewAdmin((prev) => ({ ...prev, fullName: e.target.value }))
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="john.doe@example.com"
                value={newAdmin.email}
                onChange={(e) =>
                  setNewAdmin((prev) => ({ ...prev, email: e.target.value }))
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={newAdmin.password}
                onChange={(e) =>
                  setNewAdmin((prev) => ({ ...prev, password: e.target.value }))
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="role">Role</Label>
              <Select
                id="role"
                value={newAdmin.role}
                onValueChange={(value) =>
                  setNewAdmin((prev) => ({ ...prev, role: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="superadmin">Super Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowNewAdminDialog(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={createNewAdmin}
              disabled={loadingAction === "create-admin"}
              className="flex items-center gap-2"
            >
              {loadingAction === "create-admin" ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  <span>Creating...</span>
                </>
              ) : (
                <>
                  <Check className="h-4 w-4" />
                  <span>Create Admin</span>
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Backup Download Dialog */}
      <Dialog open={showBackupDialog} onOpenChange={setShowBackupDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Download System Backup</DialogTitle>
            <DialogDescription>Select a backup to download</DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="rounded-md border overflow-hidden">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th
                      scope="col"
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                    >
                      Date
                    </th>
                    <th
                      scope="col"
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                    >
                      Size
                    </th>
                    <th
                      scope="col"
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                    >
                      Action
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {[
                    { date: "2025-04-08 02:00:00", size: "42 MB" },
                    { date: "2025-04-07 02:00:00", size: "41 MB" },
                    { date: "2025-04-06 02:00:00", size: "40 MB" },
                  ].map((backup, index) => (
                    <tr key={index}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm">{backup.date}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm">{backup.size}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex items-center gap-1 text-blue-600"
                          onClick={() => {
                            // In a real app, this would trigger the download
                            toast.success(
                              `Downloading backup from ${backup.date}`
                            );
                            setShowBackupDialog(false);
                          }}
                        >
                          <Download className="h-3.5 w-3.5" />
                          <span>Download</span>
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowBackupDialog(false)}
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirmation Dialog */}
      <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Action</DialogTitle>
            <DialogDescription>
              {actionToConfirm === "delete-admin" &&
                "Are you sure you want to delete this admin user?"}
              {actionToConfirm === "clear-logs" &&
                "Are you sure you want to clear all system logs?"}
              {actionToConfirm === "reset-sessions" &&
                "Are you sure you want to reset all user sessions? This will log everyone out."}
              {actionToConfirm === "system-backup" &&
                "Are you sure you want to create a system backup now?"}
            </DialogDescription>
          </DialogHeader>

          {actionToConfirm === "delete-admin" && (
            <div className="bg-red-50 p-3 rounded-md border border-red-200">
              <p className="text-sm text-red-600">
                This action cannot be undone. The user will be permanently
                deleted from the system.
              </p>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowConfirmDialog(false)}
            >
              Cancel
            </Button>
            <Button
              variant={
                actionToConfirm === "delete-admin" ? "destructive" : "default"
              }
              onClick={executeConfirmedAction}
              disabled={loadingAction === actionToConfirm}
              className="flex items-center gap-2"
            >
              {loadingAction === actionToConfirm ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  <span>Processing...</span>
                </>
              ) : (
                <>
                  {actionToConfirm === "delete-admin" ? (
                    <Trash2 className="h-4 w-4" />
                  ) : (
                    <Check className="h-4 w-4" />
                  )}
                  <span>
                    {actionToConfirm === "delete-admin" && "Delete Admin"}
                    {actionToConfirm === "clear-logs" && "Clear Logs"}
                    {actionToConfirm === "reset-sessions" && "Reset Sessions"}
                    {actionToConfirm === "system-backup" && "Create Backup"}
                  </span>
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SuperAdminSettings;
