import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { motion } from "framer-motion";
import {
  AlertTriangle,
  BookOpen,
  Camera,
  Check,
  GraduationCap,
  LinkIcon,
  Mail,
  Save,
  User,
} from "lucide-react";
import React, { useEffect, useState } from "react";
import { toast } from "sonner";
import { useAuth } from "../../contexts/AuthContext";

const ProfilePage = () => {
  const { user, updateProfile } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showImageDialog, setShowImageDialog] = useState(false);
  const [imageUrl, setImageUrl] = useState("");
  const [formState, setFormState] = useState({
    fullName: "",
    email: "",
    phone: "",
    department: "",
    bio: "",
    profilePicture: "",
  });

  // Initialize form with user data
  useEffect(() => {
    if (user) {
      setFormState({
        fullName: user.fullName || "",
        email: user.email || "",
        phone: user.phone || "",
        department: user.department || "",
        bio: user.bio || "",
        profilePicture: user.profilePicture || "",
      });
    }
  }, [user]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormState((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSave = async () => {
    try {
      setIsSaving(true);
      const result = await updateProfile(formState);

      if (result.success) {
        toast.success("Profile updated successfully!");
        setIsEditing(false);
      } else {
        toast.error("Failed to update profile", {
          description: result.error || "Please try again later",
        });
      }
    } catch (error) {
      toast.error("Failed to update profile", {
        description: error.message || "Please try again later",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    // Reset form to original values
    if (user) {
      setFormState({
        fullName: user.fullName || "",
        email: user.email || "",
        phone: user.phone || "",
        department: user.department || "",
        bio: user.bio || "",
        profilePicture: user.profilePicture || "",
      });
    }
    setIsEditing(false);
  };

  const handleSetProfileImage = () => {
    if (!imageUrl) {
      toast.error("Please enter a valid image URL");
      return;
    }

    // Simple image URL validation
    const isValid = /^https?:\/\/.+\.(jpg|jpeg|png|gif|webp)(\?.*)?$/i.test(
      imageUrl
    );

    if (!isValid) {
      toast.error(
        "Please enter a valid image URL (jpg, jpeg, png, gif, or webp)"
      );
      return;
    }

    setFormState((prev) => ({
      ...prev,
      profilePicture: imageUrl,
    }));

    setShowImageDialog(false);
    toast.success("Profile image updated");
  };

  const fadeIn = {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.4 },
  };

  return (
    <motion.div {...fadeIn} className="space-y-6">
      <Card className="overflow-hidden border-0 bg-gradient-to-r from-blue-500/5 to-indigo-500/5 backdrop-blur-md">
        <CardHeader className="border-b border-blue-100/10 dark:border-blue-900/10 pb-8">
          <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
            <div className="relative group">
              <Avatar className="w-24 h-24 border-4 border-white dark:border-gray-800 shadow-xl">
                <AvatarImage
                  src={
                    formState.profilePicture ||
                    `https://ui-avatars.com/api/?name=${encodeURIComponent(
                      formState.fullName || user?.fullName
                    )}&background=0D8ABC&color=fff&size=256`
                  }
                  alt={formState.fullName || user?.fullName}
                />
                <AvatarFallback className="text-2xl">
                  {(formState.fullName || user?.fullName)?.charAt(0)}
                </AvatarFallback>
              </Avatar>
              {isEditing && (
                <button
                  onClick={() => setShowImageDialog(true)}
                  className="absolute bottom-0 right-0 p-2 bg-indigo-600 text-white rounded-full shadow-lg hover:bg-indigo-700 transition-colors"
                >
                  <Camera className="h-4 w-4" />
                </button>
              )}
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <h2 className="text-2xl font-bold">
                  {formState.fullName || user?.fullName}
                </h2>
                <Badge
                  variant="outline"
                  className="bg-blue-500/10 border-blue-500/20 text-blue-600 dark:text-blue-400"
                >
                  Student
                </Badge>
              </div>
              <div className="flex flex-wrap gap-4 text-gray-600 dark:text-gray-400">
                <div className="flex items-center gap-2">
                  <Mail className="w-4 h-4" />
                  <span>{formState.email || user?.email}</span>
                </div>
                <div className="flex items-center gap-2">
                  <GraduationCap className="w-4 h-4" />
                  <span>Student ID: {user?.studentId}</span>
                </div>
              </div>
            </div>
          </div>
        </CardHeader>

        <CardContent className="pt-6">
          <Tabs defaultValue="details" className="w-full">
            <TabsList className="w-full justify-start border-b rounded-none px-0 mb-4">
              <TabsTrigger
                value="details"
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-blue-500"
              >
                Personal Details
              </TabsTrigger>
              <TabsTrigger
                value="academic"
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-blue-500"
              >
                Academic Info
              </TabsTrigger>
            </TabsList>

            <TabsContent value="details" className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="fullName">Full Name</Label>
                  {isEditing ? (
                    <Input
                      id="fullName"
                      name="fullName"
                      value={formState.fullName}
                      onChange={handleChange}
                      className="border-gray-300 dark:border-gray-600"
                      placeholder="Enter your full name"
                    />
                  ) : (
                    <Input
                      value={formState.fullName || user?.fullName}
                      readOnly
                      className="bg-white/50 dark:bg-gray-800/50"
                    />
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    name="email"
                    value={formState.email || user?.email}
                    readOnly
                    className="bg-white/50 dark:bg-gray-800/50"
                  />
                  {isEditing && (
                    <p className="text-xs text-gray-500 mt-1">
                      Email cannot be changed
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone</Label>
                  {isEditing ? (
                    <Input
                      id="phone"
                      name="phone"
                      value={formState.phone}
                      onChange={handleChange}
                      className="border-gray-300 dark:border-gray-600"
                      placeholder="Enter your phone number"
                    />
                  ) : (
                    <Input
                      value={formState.phone || "Not provided"}
                      readOnly
                      className="bg-white/50 dark:bg-gray-800/50"
                    />
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="department">Department</Label>
                  {isEditing ? (
                    <Input
                      id="department"
                      name="department"
                      value={formState.department}
                      onChange={handleChange}
                      className="border-gray-300 dark:border-gray-600"
                      placeholder="Enter your department"
                    />
                  ) : (
                    <Input
                      value={
                        formState.department ||
                        user?.department ||
                        "Not provided"
                      }
                      readOnly
                      className="bg-white/50 dark:bg-gray-800/50"
                    />
                  )}
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="bio">Bio</Label>
                  {isEditing ? (
                    <Textarea
                      id="bio"
                      name="bio"
                      value={formState.bio}
                      onChange={handleChange}
                      className="border-gray-300 dark:border-gray-600 min-h-[100px]"
                      placeholder="Tell us about yourself..."
                    />
                  ) : (
                    <div className="p-3 bg-white/50 dark:bg-gray-800/50 rounded-md border border-gray-200 dark:border-gray-700 min-h-[100px]">
                      {formState.bio || user?.bio || "No bio provided"}
                    </div>
                  )}
                </div>
              </div>
              <div className="flex justify-end gap-3">
                {isEditing ? (
                  <>
                    <Button
                      variant="outline"
                      onClick={handleCancel}
                      disabled={isSaving}
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={handleSave}
                      disabled={isSaving}
                      className="bg-green-600 hover:bg-green-700 text-white"
                    >
                      {isSaving ? (
                        <>
                          <span className="animate-spin mr-2">
                            <svg className="h-4 w-4" viewBox="0 0 24 24">
                              <circle
                                className="opacity-25"
                                cx="12"
                                cy="12"
                                r="10"
                                stroke="currentColor"
                                strokeWidth="4"
                                fill="none"
                              ></circle>
                              <path
                                className="opacity-75"
                                fill="currentColor"
                                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                              ></path>
                            </svg>
                          </span>
                          Saving...
                        </>
                      ) : (
                        <>
                          <Save className="mr-2 h-4 w-4" />
                          Save Changes
                        </>
                      )}
                    </Button>
                  </>
                ) : (
                  <Button
                    variant="outline"
                    onClick={() => setIsEditing(true)}
                    className="bg-blue-500/10 border-blue-500/20 text-blue-600 hover:bg-blue-500/20 dark:text-blue-400"
                  >
                    <User className="mr-2 h-4 w-4" />
                    Edit Profile
                  </Button>
                )}
              </div>
            </TabsContent>

            <TabsContent value="academic" className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card className="border border-blue-100/20 dark:border-blue-900/20">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <BookOpen className="w-5 h-5 text-blue-500" />
                      Current Semester
                    </CardTitle>
                    <CardDescription>
                      Academic progress tracking
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600 dark:text-gray-400">
                          Semester
                        </span>
                        <Badge>4th Semester</Badge>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600 dark:text-gray-400">
                          Credits Completed
                        </span>
                        <Badge variant="outline">45/120</Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border border-blue-100/20 dark:border-blue-900/20">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <GraduationCap className="w-5 h-5 text-blue-500" />
                      Academic Status
                    </CardTitle>
                    <CardDescription>Current standing and GPA</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600 dark:text-gray-400">
                          CGPA
                        </span>
                        <Badge
                          variant="outline"
                          className="bg-green-500/10 border-green-500/20 text-green-600"
                        >
                          3.75
                        </Badge>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600 dark:text-gray-400">
                          Status
                        </span>
                        <Badge className="bg-green-500">Good Standing</Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Image URL Dialog */}
      <AlertDialog open={showImageDialog} onOpenChange={setShowImageDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Set Profile Picture</AlertDialogTitle>
            <AlertDialogDescription>
              Enter a direct link to an image (JPG, PNG, GIF or WebP).
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-4 py-3">
            <div className="flex items-start gap-2">
              <div className="flex-1">
                <Label htmlFor="imageUrl">Image URL</Label>
                <Input
                  id="imageUrl"
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  placeholder="https://example.com/image.jpg"
                  className="mt-1"
                />
              </div>
              <div className="mt-7">
                <Button
                  variant="outline"
                  size="icon"
                  title="Test image URL"
                  onClick={() => window.open(imageUrl, "_blank")}
                  disabled={!imageUrl}
                >
                  <LinkIcon className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <div className="text-xs text-amber-600 dark:text-amber-400 flex items-start gap-1 mt-1">
              <AlertTriangle className="h-4 w-4 flex-shrink-0" />
              <span>
                Make sure the URL is from a trusted source and leads directly to
                an image file.
              </span>
            </div>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleSetProfileImage}>
              <Check className="mr-2 h-4 w-4" />
              Set Image
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </motion.div>
  );
};

export default ProfilePage;
