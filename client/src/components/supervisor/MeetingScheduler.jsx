import {
  getAssignedTeams,
  getSupervisorMeetings,
  scheduleMeeting,
} from "@/api/supervisor";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { format } from "date-fns";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import * as z from "zod";

const formSchema = z.object({
  title: z.string().min(3, { message: "Title is required" }),
  description: z.string().optional(),
  date: z.date(),
  startTime: z
    .string()
    .regex(/^\d{2}:\d{2}$/, { message: "Start time must be in HH:MM format" }),
  endTime: z
    .string()
    .regex(/^\d{2}:\d{2}$/, { message: "End time must be in HH:MM format" }),
  location: z.string().optional(),
  meetingUrl: z.string().url().optional().or(z.literal("")),
  team: z.string().optional(),
  attendees: z.array(z.string()).optional(),
  notifyAttendees: z.boolean().default(true),
});

export default function MeetingScheduler() {
  const { toast } = useToast();
  const [teams, setTeams] = useState([]);
  const [meetings, setMeetings] = useState([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("upcoming");

  const form = useForm({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: "",
      description: "",
      date: new Date(),
      startTime: "09:00",
      endTime: "10:00",
      location: "",
      meetingUrl: "",
      team: "",
      attendees: [],
      notifyAttendees: true,
    },
  });

  useEffect(() => {
    loadTeams();
    loadMeetings();
  }, []);

  const loadTeams = async () => {
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
    }
  };

  const loadMeetings = async () => {
    setLoading(true);
    try {
      const filters = {
        limit: 50,
        status: activeTab === "upcoming" ? "scheduled" : undefined,
      };

      const response = await getSupervisorMeetings(filters);
      if (response.success) {
        setMeetings(response.data.meetings || []);
      }
    } catch (error) {
      toast({
        title: "Error loading meetings",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const onSubmit = async (values) => {
    setLoading(true);
    try {
      // Format data for API
      const meetingData = {
        ...values,
        date: format(values.date, "yyyy-MM-dd"),
      };

      const response = await scheduleMeeting(meetingData);
      if (response.success) {
        toast({
          title: "Meeting scheduled",
          description: "The meeting has been scheduled successfully.",
        });
        setOpen(false);
        form.reset();
        loadMeetings();
      }
    } catch (error) {
      toast({
        title: "Error scheduling meeting",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleTabChange = (value) => {
    setActiveTab(value);
    // Reload meetings with appropriate filters when tab changes
    loadMeetings();
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Meeting Management</h2>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button>Schedule New Meeting</Button>
          </DialogTrigger>
          <DialogContent className="max-w-xl">
            <DialogHeader>
              <DialogTitle>Schedule a Meeting</DialogTitle>
              <DialogDescription>
                Fill in the details to schedule a new meeting with your team.
              </DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form
                onSubmit={form.handleSubmit(onSubmit)}
                className="space-y-4"
              >
                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Meeting Title</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Weekly Progress Meeting"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description (Optional)</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Discuss project progress and next steps..."
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="date"
                    render={({ field }) => (
                      <FormItem className="flex flex-col">
                        <FormLabel>Date</FormLabel>
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={field.onChange}
                          disabled={(date) => date < new Date()}
                          className="rounded-md border"
                        />
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="space-y-4">
                    <FormField
                      control={form.control}
                      name="startTime"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Start Time</FormLabel>
                          <FormControl>
                            <Input type="time" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="endTime"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>End Time</FormLabel>
                          <FormControl>
                            <Input type="time" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="location"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Location (Optional)</FormLabel>
                        <FormControl>
                          <Input placeholder="Meeting Room B-101" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="meetingUrl"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Meeting URL (Optional)</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="https://meet.google.com/..."
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="team"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Team</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a team" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {teams.map((team) => (
                            <SelectItem key={team._id} value={team._id}>
                              {team.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="notifyAttendees"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel>Send notification to attendees</FormLabel>
                      </div>
                    </FormItem>
                  )}
                />

                <DialogFooter>
                  <Button type="submit" disabled={loading}>
                    {loading ? "Scheduling..." : "Schedule Meeting"}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <Tabs defaultValue="upcoming" onValueChange={handleTabChange}>
        <TabsList>
          <TabsTrigger value="upcoming">Upcoming Meetings</TabsTrigger>
          <TabsTrigger value="past">Past Meetings</TabsTrigger>
          <TabsTrigger value="all">All Meetings</TabsTrigger>
        </TabsList>

        <TabsContent value="upcoming" className="pt-4">
          {renderMeetingsTable()}
        </TabsContent>

        <TabsContent value="past" className="pt-4">
          {renderMeetingsTable()}
        </TabsContent>

        <TabsContent value="all" className="pt-4">
          {renderMeetingsTable()}
        </TabsContent>
      </Tabs>
    </div>
  );

  function renderMeetingsTable() {
    if (loading) {
      return <div className="text-center py-8">Loading meetings...</div>;
    }

    if (meetings.length === 0) {
      return (
        <div className="text-center py-8 text-muted-foreground">
          No meetings found. Schedule a new meeting to get started.
        </div>
      );
    }

    return (
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead>Date & Time</TableHead>
                <TableHead>Team</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {meetings.map((meeting) => (
                <TableRow key={meeting._id}>
                  <TableCell className="font-medium">{meeting.title}</TableCell>
                  <TableCell>
                    {format(new Date(meeting.date), "MMM dd, yyyy")}
                    <div className="text-sm text-muted-foreground">
                      {format(
                        new Date(`2000-01-01T${meeting.startTime}`),
                        "h:mm a"
                      )}{" "}
                      -
                      {format(
                        new Date(`2000-01-01T${meeting.endTime}`),
                        "h:mm a"
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    {meeting.team?.name || "Individual Meeting"}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        meeting.status === "scheduled"
                          ? "outline"
                          : meeting.status === "completed"
                          ? "default"
                          : meeting.status === "cancelled"
                          ? "destructive"
                          : "secondary"
                      }
                    >
                      {meeting.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm">
                        View
                      </Button>
                      {meeting.status === "scheduled" && (
                        <>
                          <Button variant="outline" size="sm">
                            Edit
                          </Button>
                          <Button variant="destructive" size="sm">
                            Cancel
                          </Button>
                        </>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    );
  }
}
