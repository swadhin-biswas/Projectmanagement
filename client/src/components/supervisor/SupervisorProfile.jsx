import {
  getSupervisorProfile,
  updateSupervisorProfile,
} from "@/api/supervisor";
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
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/use-toast";
import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import * as z from "zod";

const profileSchema = z.object({
  specialization: z.string().optional(),
  department: z.string().optional(),
  bio: z.string().optional(),
  contactNumber: z.string().optional(),
  officeHours: z.string().optional(),
  officeLocation: z.string().optional(),
  profilePicture: z.string().optional(),
  researchInterests: z.string().optional(),
  expertise: z.array(z.string()).optional(),
});

export default function SupervisorProfile() {
  const { toast } = useToast();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  const form = useForm({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      specialization: "",
      department: "",
      bio: "",
      contactNumber: "",
      officeHours: "",
      officeLocation: "",
      profilePicture: "",
      researchInterests: "",
      expertise: [],
    },
  });

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    setLoading(true);
    try {
      const response = await getSupervisorProfile();
      if (response.success) {
        setProfile(response.data);

        // Update form with profile data
        const formData = {
          specialization: response.data.specialization || "",
          department: response.data.department || "",
          bio: response.data.biography || "",
          contactNumber: response.data.contactDetails?.phone || "",
          officeHours: response.data.availability?.officeHours || "",
          officeLocation: response.data.contactDetails?.office || "",
          profilePicture: response.data.user?.profilePicture || "",
          researchInterests: response.data.researchInterests?.join(", ") || "",
          expertise: response.data.expertise || [],
        };

        form.reset(formData);
      }
    } catch (error) {
      toast({
        title: "Error loading profile",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const onSubmit = async (values) => {
    setUpdating(true);
    try {
      // Format data for API
      const updateData = {
        specialization: values.specialization,
        department: values.department,
        biography: values.bio,
        contactDetails: {
          phone: values.contactNumber,
          office: values.officeLocation,
          email: profile?.user?.email,
        },
        availability: {
          officeHours: values.officeHours,
        },
        researchInterests: values.researchInterests
          ? values.researchInterests.split(",").map((item) => item.trim())
          : [],
        expertise: values.expertise,
      };

      const response = await updateSupervisorProfile(updateData);
      if (response.success) {
        toast({
          title: "Profile updated",
          description: "Your profile has been updated successfully.",
        });
        loadProfile(); // Reload the profile to get the latest data
      }
    } catch (error) {
      toast({
        title: "Error updating profile",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setUpdating(false);
    }
  };

  if (loading) {
    return (
      <div className="h-48 flex items-center justify-center">
        Loading profile...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="space-y-0.5">
        <h2 className="text-2xl font-bold tracking-tight">Profile</h2>
        <p className="text-muted-foreground">
          Manage your personal information and preferences
        </p>
      </div>
      <Separator />

      <Tabs defaultValue="general" className="space-y-4">
        <TabsList>
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="professional">Professional</TabsTrigger>
          <TabsTrigger value="preferences">Preferences</TabsTrigger>
        </TabsList>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            <TabsContent value="general" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>General Information</CardTitle>
                  <CardDescription>
                    Update your basic information
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center space-x-4">
                    <Avatar className="h-20 w-20">
                      <AvatarImage src={profile?.user?.profilePicture} />
                      <AvatarFallback>
                        {profile?.user?.fullName
                          ?.split(" ")
                          .map((n) => n[0])
                          .join("")}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <h3 className="text-lg font-medium">
                        {profile?.user?.fullName}
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        {profile?.user?.email}
                      </p>
                    </div>
                  </div>

                  <FormField
                    control={form.control}
                    name="department"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Department</FormLabel>
                        <FormControl>
                          <Input placeholder="Department" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="specialization"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Specialization</FormLabel>
                        <FormControl>
                          <Input placeholder="Specialization" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="bio"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Bio</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Tell us about yourself"
                            className="min-h-[100px]"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="professional" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Professional Information</CardTitle>
                  <CardDescription>
                    Update your professional details and research interests
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <FormField
                    control={form.control}
                    name="researchInterests"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Research Interests</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="AI, Machine Learning, Data Science"
                            {...field}
                          />
                        </FormControl>
                        <FormDescription>
                          Separate multiple interests with commas
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="officeLocation"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Office Location</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Room 123, Engineering Building"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="officeHours"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Office Hours</FormLabel>
                        <FormControl>
                          <Input placeholder="Mon 10-12, Wed 2-4" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="contactNumber"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Contact Number</FormLabel>
                        <FormControl>
                          <Input placeholder="+1 123 456 7890" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="preferences" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Preferences</CardTitle>
                  <CardDescription>
                    Configure your notification and system preferences
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground text-sm">
                    Notification preferences will be available soon.
                  </p>
                </CardContent>
              </Card>
            </TabsContent>

            <div className="flex justify-end">
              <Button type="submit" disabled={updating || loading}>
                {updating ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </form>
        </Form>
      </Tabs>
    </div>
  );
}
