import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/contexts/AuthContext";
import { AnimatePresence, motion } from "framer-motion";
import { Camera, Loader2 } from "lucide-react";
import React, { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

const StudentProfile = () => {
  const { user, updateProfile } = useAuth();
  const [isUpdating, setIsUpdating] = useState(false);
  const [showProfileImageDialog, setShowProfileImageDialog] = useState(false);
  const [profileImageUrl, setProfileImageUrl] = useState("");
  const [isValidatingImage, setIsValidatingImage] = useState(false);
  const [previewImage, setPreviewImage] = useState(null);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm({
    defaultValues: {
      fullName: user?.fullName || "",
      email: user?.email || "",
      department: user?.department || "",
      bio: user?.bio || "",
      contactNumber: user?.contactNumber || "",
    },
  });

  useEffect(() => {
    if (user) {
      setValue("fullName", user.fullName || "");
      setValue("email", user.email || "");
      setValue("department", user.department || "");
      setValue("bio", user.bio || "");
      setValue("contactNumber", user.contactNumber || "");
      setProfileImageUrl(user.profilePicture || "");
    }
  }, [user, setValue]);

  const onSubmit = async (data) => {
    try {
      setIsUpdating(true);
      const profileData = {
        ...data,
        profilePicture: profileImageUrl,
      };

      const result = await updateProfile(profileData);

      if (result.success) {
        toast.success("Profile updated successfully");
      } else {
        toast.error(result.error || "Failed to update profile");
      }
    } catch (error) {
      toast.error("An error occurred while updating your profile");
      console.error(error);
    } finally {
      setIsUpdating(false);
    }
  };

  const validateImageUrl = async () => {
    if (!profileImageUrl) return;

    setIsValidatingImage(true);
    setPreviewImage(null);

    // Check if URL ends with supported image extensions
    const isValidFormat = /\.(jpeg|jpg|png|gif|webp)(\?.*)?$/i.test(
      profileImageUrl
    );

    if (!isValidFormat) {
      toast.error(
        "URL must point to a valid image file (JPEG, PNG, GIF, or WebP)"
      );
      setIsValidatingImage(false);
      return;
    }

    try {
      // Check if the image loads
      await new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = resolve;
        img.onerror = reject;
        img.src = profileImageUrl;
      });

      setPreviewImage(profileImageUrl);
      toast.success("Image validated successfully");
    } catch (error) {
      toast.error("Failed to load image. Please check the URL and try again");
      console.error("Image validation error:", error);
    } finally {
      setIsValidatingImage(false);
    }
  };

  const handleProfileImageSubmit = () => {
    if (previewImage) {
      setProfileImageUrl(previewImage);
      setShowProfileImageDialog(false);
    } else {
      toast.error("Please validate the image URL first");
    }
  };

  const getInitials = (name) => {
    if (!name) return "S";
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase();
  };

  const fadeIn = {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -20 },
    transition: { duration: 0.3 },
  };

  return (
    <AnimatePresence>
      <motion.div
        className="max-w-2xl mx-auto py-8 px-4 sm:px-6"
        initial="initial"
        animate="animate"
        exit="exit"
        variants={fadeIn}
      >
        <Card className="border-gray-200 dark:border-gray-800 shadow-md">
          <CardHeader className="relative pb-0">
            <div className="flex flex-col md:flex-row items-center md:items-start gap-4">
              <div className="relative group">
                <Avatar className="h-24 w-24 border-4 border-white dark:border-gray-800 shadow-md overflow-hidden">
                  {user?.profilePicture ? (
                    <AvatarImage
                      src={user.profilePicture}
                      alt={user.fullName}
                    />
                  ) : (
                    <AvatarFallback className="bg-blue-600 text-white text-xl">
                      {getInitials(user?.fullName)}
                    </AvatarFallback>
                  )}
                </Avatar>
                <Dialog
                  open={showProfileImageDialog}
                  onOpenChange={setShowProfileImageDialog}
                >
                  <DialogTrigger asChild>
                    <Button
                      className="absolute bottom-0 right-0 rounded-full w-8 h-8 p-0 bg-blue-600 hover:bg-blue-700"
                      size="icon"
                    >
                      <Camera className="h-4 w-4" />
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Update Profile Picture</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div className="flex flex-col space-y-2">
                        <Label htmlFor="profileUrl">Image URL</Label>
                        <div className="flex space-x-2">
                          <Input
                            id="profileUrl"
                            placeholder="https://example.com/image.jpg"
                            value={profileImageUrl}
                            onChange={(e) => setProfileImageUrl(e.target.value)}
                          />
                          <Button
                            onClick={validateImageUrl}
                            variant="outline"
                            disabled={isValidatingImage || !profileImageUrl}
                          >
                            {isValidatingImage ? (
                              <Loader2 className="h-4 w-4 animate-spin mr-2" />
                            ) : (
                              "Validate"
                            )}
                          </Button>
                        </div>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          Enter a direct link to an image (JPEG, PNG, GIF, or
                          WebP)
                        </p>
                      </div>

                      {previewImage && (
                        <div className="mt-4 flex justify-center">
                          <div className="relative w-40 h-40 overflow-hidden rounded-full border-4 border-white dark:border-gray-800 shadow-md">
                            <img
                              src={previewImage}
                              alt="Profile preview"
                              className="w-full h-full object-cover"
                            />
                          </div>
                        </div>
                      )}
                    </div>
                    <DialogFooter>
                      <Button
                        variant="outline"
                        onClick={() => setShowProfileImageDialog(false)}
                      >
                        Cancel
                      </Button>
                      <Button
                        onClick={handleProfileImageSubmit}
                        disabled={!previewImage}
                      >
                        Save
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>

              <div className="text-center md:text-left">
                <CardTitle className="text-2xl">{user?.fullName}</CardTitle>
                <CardDescription className="text-gray-600 dark:text-gray-400">
                  Student ID: {user?.studentId || "Not assigned"}
                </CardDescription>
                <div className="mt-1 flex flex-wrap gap-2 justify-center md:justify-start">
                  <span className="inline-flex items-center rounded-full bg-blue-100 dark:bg-blue-900 px-2.5 py-0.5 text-xs font-medium text-blue-800 dark:text-blue-300">
                    Student
                  </span>
                  {user?.department && (
                    <span className="inline-flex items-center rounded-full bg-gray-100 dark:bg-gray-800 px-2.5 py-0.5 text-xs font-medium text-gray-800 dark:text-gray-300">
                      {user.department}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </CardHeader>

          <CardContent className="pt-6">
            <form onSubmit={handleSubmit(onSubmit)}>
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="fullName">Full Name</Label>
                    <Input
                      id="fullName"
                      {...register("fullName", {
                        required: "Full name is required",
                      })}
                    />
                    {errors.fullName && (
                      <p className="text-red-500 text-sm">
                        {errors.fullName.message}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email">Email Address</Label>
                    <Input
                      id="email"
                      type="email"
                      {...register("email", { required: "Email is required" })}
                      disabled
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="department">Department</Label>
                    <Input
                      id="department"
                      {...register("department", {
                        required: "Department is required",
                      })}
                    />
                    {errors.department && (
                      <p className="text-red-500 text-sm">
                        {errors.department.message}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="contactNumber">
                      Contact Number (Optional)
                    </Label>
                    <Input id="contactNumber" {...register("contactNumber")} />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="bio">Bio (Optional)</Label>
                  <Textarea
                    id="bio"
                    {...register("bio")}
                    placeholder="Tell us a bit about yourself"
                    className="h-24"
                  />
                </div>

                <div className="flex justify-end">
                  <Button
                    type="submit"
                    disabled={isUpdating}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    {isUpdating ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Updating...
                      </>
                    ) : (
                      "Update Profile"
                    )}
                  </Button>
                </div>
              </div>
            </form>
          </CardContent>
        </Card>
      </motion.div>
    </AnimatePresence>
  );
};

export default StudentProfile;
