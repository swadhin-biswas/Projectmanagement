import {
  createNotification,
  getAssignedStudents,
  getAssignedTeams,
  getTeamDetails,
  sendEmail,
} from "@/api/supervisor";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/use-toast";
import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import * as z from "zod";

const emailSchema = z.object({
  recipients: z.array(z.string()).min(1, "Select at least one recipient"),
  subject: z.string().min(1, "Subject is required"),
  message: z.string().min(10, "Message is too short"),
  cc: z.array(z.string()).optional(),
  bcc: z.array(z.string()).optional(),
  priority: z.enum(["normal", "high", "low"]).default("normal"),
  attachments: z.array(z.any()).optional(),
});

const notificationSchema = z.object({
  recipients: z.array(z.string()).min(1, "Select at least one recipient"),
  title: z.string().min(1, "Title is required"),
  message: z.string().min(5, "Message is too short"),
  type: z.enum(["info", "warning", "success", "error"]).default("info"),
  sendEmail: z.boolean().default(false),
  relatedTo: z
    .object({
      type: z.enum(["project", "submission", "meeting", "feedback"]).optional(),
      id: z.string().optional(),
    })
    .optional(),
});

export default function CommunicationCenter() {
  const { toast } = useToast();
  const [communicationType, setCommunicationType] = useState("email");
  const [teams, setTeams] = useState([]);
  const [students, setStudents] = useState([]);
  const [selectedTeam, setSelectedTeam] = useState(null);
  const [teamMembers, setTeamMembers] = useState([]);
  const [recipientType, setRecipientType] = useState("individual"); // individual, team, all
  const [selectedStudents, setSelectedStudents] = useState([]);
  const [recentCommunications, setRecentCommunications] = useState([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const emailForm = useForm({
    resolver: zodResolver(emailSchema),
    defaultValues: {
      recipients: [],
      subject: "",
      message: "",
      cc: [],
      bcc: [],
      priority: "normal",
      attachments: [],
    },
  });

  const notificationForm = useForm({
    resolver: zodResolver(notificationSchema),
    defaultValues: {
      recipients: [],
      title: "",
      message: "",
      type: "info",
      sendEmail: false,
      relatedTo: {
        type: undefined,
        id: undefined,
      },
    },
  });

  useEffect(() => {
    loadTeams();
    loadStudents();
  }, []);

  useEffect(() => {
    if (selectedTeam) {
      loadTeamDetails(selectedTeam);
    }
  }, [selectedTeam]);

  useEffect(() => {
    resetRecipients();
  }, [recipientType]);

  const loadTeams = async () => {
    setLoading(true);
    try {
      const response = await getAssignedTeams();
      if (response.success) {
        setTeams(response.data.teams || []);
      }
    } catch (error) {
      toast({
        title: "Error loading teams",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const loadStudents = async () => {
    setLoading(true);
    try {
      const response = await getAssignedStudents({ limit: 100 });
      if (response.success) {
        setStudents(response.data.students || []);
      }
    } catch (error) {
      toast({
        title: "Error loading students",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const loadTeamDetails = async (teamId) => {
    setLoading(true);
    try {
      const response = await getTeamDetails(teamId);
      if (response.success) {
        setTeamMembers(response.data.team?.members || []);

        // If team is selected as recipient type, update recipients
        if (recipientType === "team") {
          updateTeamRecipients(response.data.team?.members || []);
        }
      }
    } catch (error) {
      toast({
        title: "Error loading team details",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const updateTeamRecipients = (members) => {
    const memberIds = members.map((member) => member.user._id);

    if (communicationType === "email") {
      emailForm.setValue("recipients", memberIds);
    } else {
      notificationForm.setValue("recipients", memberIds);
    }
  };

  const resetRecipients = () => {
    if (communicationType === "email") {
      emailForm.setValue("recipients", []);
    } else {
      notificationForm.setValue("recipients", []);
    }

    setSelectedStudents([]);

    if (recipientType === "team" && selectedTeam && teamMembers.length > 0) {
      updateTeamRecipients(teamMembers);
    } else if (recipientType === "all") {
      const allStudentIds = students.map((student) => student._id);

      if (communicationType === "email") {
        emailForm.setValue("recipients", allStudentIds);
      } else {
        notificationForm.setValue("recipients", allStudentIds);
      }

      setSelectedStudents(allStudentIds);
    }
  };

  const handleTeamChange = (teamId) => {
    setSelectedTeam(teamId);

    if (recipientType === "team") {
      // Recipients will be updated in the useEffect after team details load
    }
  };

  const handleRecipientTypeChange = (value) => {
    setRecipientType(value);
    // Recipients will be reset in the useEffect
  };

  const handleStudentSelection = (studentId, isChecked) => {
    let newSelectedStudents;

    if (isChecked) {
      newSelectedStudents = [...selectedStudents, studentId];
    } else {
      newSelectedStudents = selectedStudents.filter((id) => id !== studentId);
    }

    setSelectedStudents(newSelectedStudents);

    if (communicationType === "email") {
      emailForm.setValue("recipients", newSelectedStudents);
    } else {
      notificationForm.setValue("recipients", newSelectedStudents);
    }
  };

  const handleEmailSubmit = async (values) => {
    setSubmitting(true);
    try {
      // Prepare email data
      const emailData = {
        to: values.recipients,
        subject: values.subject,
        message: values.message,
        cc: values.cc?.length > 0 ? values.cc : undefined,
        bcc: values.bcc?.length > 0 ? values.bcc : undefined,
        // TODO: Handle attachments
      };

      const response = await sendEmail(emailData);

      if (response.success) {
        toast({
          title: "Email sent",
          description: `Email successfully sent to ${values.recipients.length} recipient(s)`,
        });

        // Add to recent communications
        setRecentCommunications((prev) => [
          {
            id: Date.now(),
            type: "email",
            title: values.subject,
            recipients: values.recipients.length,
            date: new Date(),
          },
          ...prev.slice(0, 4), // Keep only 5 most recent
        ]);

        // Reset form but keep recipients
        const currentRecipients = values.recipients;
        emailForm.reset({
          ...emailForm.formState.defaultValues,
          recipients: currentRecipients,
        });
      }
    } catch (error) {
      toast({
        title: "Error sending email",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleNotificationSubmit = async (values) => {
    setSubmitting(true);
    try {
      // Prepare notification data
      const notificationData = {
        recipients: values.recipients,
        title: values.title,
        message: values.message,
        type: values.type,
      };

      // Add related item if specified
      if (values.relatedTo?.type && values.relatedTo?.id) {
        notificationData.relatedTo = {
          type: values.relatedTo.type,
          id: values.relatedTo.id,
        };
      }

      const response = await createNotification(notificationData);

      if (response.success) {
        toast({
          title: "Notification sent",
          description: `Notification sent to ${values.recipients.length} recipient(s)`,
        });

        // Add to recent communications
        setRecentCommunications((prev) => [
          {
            id: Date.now(),
            type: "notification",
            title: values.title,
            recipients: values.recipients.length,
            date: new Date(),
          },
          ...prev.slice(0, 4), // Keep only 5 most recent
        ]);

        // Reset form but keep recipients
        const currentRecipients = values.recipients;
        notificationForm.reset({
          ...notificationForm.formState.defaultValues,
          recipients: currentRecipients,
        });
      }

      // If also sending email
      if (values.sendEmail) {
        try {
          await sendEmail({
            to: values.recipients,
            subject: values.title,
            message: values.message,
          });

          toast({
            title: "Email notification sent",
            description: "Email notification was also sent successfully",
          });
        } catch (emailError) {
          toast({
            title: "Notification sent but email failed",
            description:
              "The notification was sent but the email notification failed",
            variant: "warning",
          });
        }
      }
    } catch (error) {
      toast({
        title: "Error sending notification",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const renderRecipientSelector = () => {
    const activeForm =
      communicationType === "email" ? emailForm : notificationForm;
    const recipients = activeForm.watch("recipients");

    return (
      <div className="space-y-4">
        <div className="grid grid-cols-3 gap-4">
          <div className="space-y-4">
            <h3 className="text-md font-medium">Recipient Type</h3>
            <RadioGroup
              value={recipientType}
              onValueChange={handleRecipientTypeChange}
              className="space-y-2"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="individual" id="individual" />
                <label htmlFor="individual" className="text-sm">
                  Individual Students
                </label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="team" id="team" />
                <label htmlFor="team" className="text-sm">
                  Entire Team
                </label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="all" id="all" />
                <label htmlFor="all" className="text-sm">
                  All Supervised Students
                </label>
              </div>
            </RadioGroup>
          </div>

          {recipientType === "team" && (
            <div className="col-span-2 space-y-4">
              <FormLabel>Select Team</FormLabel>
              <Select
                value={selectedTeam}
                onValueChange={handleTeamChange}
                disabled={loading}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a team" />
                </SelectTrigger>
                <SelectContent>
                  {teams.map((team) => (
                    <SelectItem key={team._id} value={team._id}>
                      {team.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {selectedTeam && teamMembers.length > 0 && (
                <div className="mt-4">
                  <FormLabel>Team Members ({teamMembers.length})</FormLabel>
                  <div className="flex flex-wrap gap-2 mt-2 max-h-32 overflow-y-auto">
                    {teamMembers.map((member) => (
                      <Badge key={member.user._id} variant="outline">
                        {member.user.fullName}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {recipientType === "individual" && (
            <div className="col-span-2 space-y-4">
              <FormLabel>Select Students</FormLabel>
              <ScrollArea className="h-60 w-full border rounded-md p-2">
                <div className="space-y-2">
                  {students.map((student) => (
                    <div
                      key={student._id}
                      className="flex items-center space-x-2 p-2 hover:bg-muted rounded-sm"
                    >
                      <Checkbox
                        id={`student-${student._id}`}
                        checked={selectedStudents.includes(student._id)}
                        onCheckedChange={(checked) =>
                          handleStudentSelection(student._id, checked)
                        }
                      />
                      <label
                        htmlFor={`student-${student._id}`}
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer select-none w-full"
                      >
                        {student.fullName}
                        <span className="block text-xs text-muted-foreground mt-1">
                          {student.email}
                        </span>
                      </label>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>
          )}
        </div>

        <div className="flex items-center space-x-2">
          <span className="text-sm">
            Selected {recipients.length} recipient
            {recipients.length !== 1 ? "s" : ""}
          </span>
        </div>
      </div>
    );
  };

  const renderEmailForm = () => {
    return (
      <Form {...emailForm}>
        <form
          onSubmit={emailForm.handleSubmit(handleEmailSubmit)}
          className="space-y-6"
        >
          {renderRecipientSelector()}

          <Separator />

          <FormField
            control={emailForm.control}
            name="subject"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Subject</FormLabel>
                <FormControl>
                  <Input placeholder="Email subject" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={emailForm.control}
            name="message"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Message</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="Your email message"
                    className="min-h-[200px]"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={emailForm.control}
            name="priority"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Priority</FormLabel>
                <Select
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select priority" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="normal">Normal</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* TODO: Implement file upload for attachments */}

          <Button
            type="submit"
            className="w-full"
            disabled={submitting || !emailForm.formState.isValid}
          >
            {submitting ? "Sending..." : "Send Email"}
          </Button>
        </form>
      </Form>
    );
  };

  const renderNotificationForm = () => {
    return (
      <Form {...notificationForm}>
        <form
          onSubmit={notificationForm.handleSubmit(handleNotificationSubmit)}
          className="space-y-6"
        >
          {renderRecipientSelector()}

          <Separator />

          <FormField
            control={notificationForm.control}
            name="title"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Notification Title</FormLabel>
                <FormControl>
                  <Input placeholder="Title of notification" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={notificationForm.control}
            name="message"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Message</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="Your notification message"
                    className="min-h-[120px]"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={notificationForm.control}
            name="type"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Notification Type</FormLabel>
                <Select
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="info">Information</SelectItem>
                    <SelectItem value="success">Success</SelectItem>
                    <SelectItem value="warning">Warning</SelectItem>
                    <SelectItem value="error">Error</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={notificationForm.control}
            name="sendEmail"
            render={({ field }) => (
              <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                <FormControl>
                  <Checkbox
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                </FormControl>
                <div className="space-y-1 leading-none">
                  <FormLabel>Also send as email</FormLabel>
                  <FormDescription>
                    The notification will also be sent as an email to all
                    recipients
                  </FormDescription>
                </div>
              </FormItem>
            )}
          />

          <Button
            type="submit"
            className="w-full"
            disabled={submitting || !notificationForm.formState.isValid}
          >
            {submitting ? "Sending..." : "Send Notification"}
          </Button>
        </form>
      </Form>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Communication Center</h2>
      </div>

      <Tabs
        value={communicationType}
        onValueChange={(value) => {
          setCommunicationType(value);
          resetRecipients();
        }}
      >
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="email">Email</TabsTrigger>
          <TabsTrigger value="notification">Notification</TabsTrigger>
        </TabsList>

        <TabsContent value="email" className="space-y-4 pt-4">
          <Card>
            <CardHeader>
              <CardTitle>Send Email</CardTitle>
              <CardDescription>
                Send emails to individual students or teams
              </CardDescription>
            </CardHeader>
            <CardContent>{renderEmailForm()}</CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notification" className="space-y-4 pt-4">
          <Card>
            <CardHeader>
              <CardTitle>Send Notification</CardTitle>
              <CardDescription>
                Send in-app notifications to students
              </CardDescription>
            </CardHeader>
            <CardContent>{renderNotificationForm()}</CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {recentCommunications.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Recent Communications</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Type</TableHead>
                  <TableHead>Title</TableHead>
                  <TableHead>Recipients</TableHead>
                  <TableHead>Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentCommunications.map((comm) => (
                  <TableRow key={comm.id}>
                    <TableCell>
                      <Badge
                        variant={comm.type === "email" ? "outline" : "default"}
                      >
                        {comm.type === "email" ? "Email" : "Notification"}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-medium">{comm.title}</TableCell>
                    <TableCell>{comm.recipients} recipient(s)</TableCell>
                    <TableCell>
                      {comm.date.toLocaleDateString()}{" "}
                      {comm.date.toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
