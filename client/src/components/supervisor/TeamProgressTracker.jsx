import {
  getAssignedTeams,
  getTeamDetails,
  updateTeamProgress,
} from "@/api/supervisor";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
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
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
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
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/use-toast";
import { zodResolver } from "@hookform/resolvers/zod";
import { AlertCircle, AlertTriangle, CheckCircle2, Clock } from "lucide-react";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import * as z from "zod";

const progressSchema = z.object({
  milestone: z.string(),
  status: z.enum(["not_started", "in_progress", "completed", "delayed"]),
  completionPercentage: z.coerce.number().min(0).max(100).optional(),
  feedback: z.string().optional(),
});

const RiskLevelBadge = ({ level }) => {
  const variants = {
    low: {
      variant: "outline",
      icon: <CheckCircle2 className="h-4 w-4 mr-1" />,
    },
    medium: { variant: "secondary", icon: <Clock className="h-4 w-4 mr-1" /> },
    high: {
      variant: "warning",
      icon: <AlertTriangle className="h-4 w-4 mr-1" />,
    },
    critical: {
      variant: "destructive",
      icon: <AlertCircle className="h-4 w-4 mr-1" />,
    },
  };

  const config = variants[level] || variants.low;

  return (
    <Badge variant={config.variant} className="flex items-center">
      {config.icon}
      {level.charAt(0).toUpperCase() + level.slice(1)} Risk
    </Badge>
  );
};

export default function TeamProgressTracker() {
  const { toast } = useToast();
  const [teams, setTeams] = useState([]);
  const [selectedTeam, setSelectedTeam] = useState(null);
  const [teamDetails, setTeamDetails] = useState(null);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const form = useForm({
    resolver: zodResolver(progressSchema),
    defaultValues: {
      milestone: "",
      status: "not_started",
      completionPercentage: 0,
      feedback: "",
    },
  });

  useEffect(() => {
    loadTeams();
  }, []);

  useEffect(() => {
    if (selectedTeam) {
      loadTeamDetails(selectedTeam);
    }
  }, [selectedTeam]);

  const loadTeams = async () => {
    setLoading(true);
    try {
      const response = await getAssignedTeams();
      if (response.success) {
        setTeams(response.data.teams || []);
        if (response.data.teams?.length > 0) {
          setSelectedTeam(response.data.teams[0]._id);
        }
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

  const loadTeamDetails = async (teamId) => {
    setLoading(true);
    try {
      const response = await getTeamDetails(teamId);
      if (response.success) {
        setTeamDetails(response.data);
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

  const onSubmit = async (values) => {
    if (!selectedTeam) {
      toast({
        title: "Error updating progress",
        description: "No team selected",
        variant: "destructive",
      });
      return;
    }

    setSubmitting(true);
    try {
      const response = await updateTeamProgress(selectedTeam, values);
      if (response.success) {
        toast({
          title: "Progress updated",
          description: "Team progress has been updated successfully.",
        });
        loadTeamDetails(selectedTeam);
        form.reset();
      }
    } catch (error) {
      toast({
        title: "Error updating progress",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleTeamChange = (teamId) => {
    setSelectedTeam(teamId);
    form.reset();
  };

  // Calculate overall progress
  const calculateOverallProgress = () => {
    if (!teamDetails?.progressTracking?.milestones?.length) {
      return 0;
    }

    const milestones = teamDetails.progressTracking.milestones;
    let completed = 0;

    milestones.forEach((milestone) => {
      if (milestone.status === "completed") {
        completed += 1;
      } else if (milestone.status === "in_progress") {
        completed += milestone.progress / 100;
      }
    });

    return Math.round((completed / milestones.length) * 100);
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case "completed":
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case "in_progress":
        return <Clock className="h-4 w-4 text-blue-500" />;
      case "delayed":
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      default:
        return <AlertTriangle className="h-4 w-4 text-gray-400" />;
    }
  };

  if (loading && !teamDetails) {
    return (
      <div className="h-48 flex items-center justify-center">
        Loading teams...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Team Progress Tracker</h2>
        <Select
          value={selectedTeam}
          onValueChange={handleTeamChange}
          disabled={loading}
        >
          <SelectTrigger className="w-[240px]">
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
      </div>

      {teamDetails && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Team Information */}
          <Card className="md:col-span-2">
            <CardHeader className="pb-2">
              <CardTitle>Team Information</CardTitle>
              <CardDescription>Basic team details and progress</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <h3 className="font-medium">Team Members</h3>
                  <div className="mt-2">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Name</TableHead>
                          <TableHead>Email</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {teamDetails.team.members.map((member) => (
                          <TableRow key={member.user._id}>
                            <TableCell>{member.user.fullName}</TableCell>
                            <TableCell>{member.user.email}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>

                <div>
                  <h3 className="font-medium">Project</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    {teamDetails.team.project?.name ||
                      "No project assigned yet"}
                  </p>
                </div>

                <div>
                  <h3 className="font-medium">Progress Overview</h3>
                  <div className="mt-2 space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Overall Completion</span>
                      <span>{calculateOverallProgress()}%</span>
                    </div>
                    <Progress value={calculateOverallProgress()} />
                  </div>
                </div>

                <div>
                  <h3 className="font-medium">Risk Assessment</h3>
                  <div className="mt-2">
                    {teamDetails.progressTracking?.riskAssessment ? (
                      <div className="space-y-2">
                        <div className="flex items-center">
                          <RiskLevelBadge
                            level={
                              teamDetails.progressTracking.riskAssessment.level
                            }
                          />
                        </div>

                        <div className="text-sm">
                          <strong className="font-medium">Reasons:</strong>
                          <ul className="list-disc list-inside mt-1">
                            {teamDetails.progressTracking.riskAssessment.reasons.map(
                              (reason, idx) => (
                                <li key={idx}>{reason}</li>
                              )
                            )}
                          </ul>
                        </div>

                        <div className="text-sm">
                          <strong className="font-medium">
                            Mitigation Plan:
                          </strong>
                          <p className="mt-1">
                            {teamDetails.progressTracking.riskAssessment
                              .mitigationPlan || "No mitigation plan provided"}
                          </p>
                        </div>
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">
                        No risk assessment available
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Update Progress */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle>Update Progress</CardTitle>
              <CardDescription>Record milestone progress</CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form
                  onSubmit={form.handleSubmit(onSubmit)}
                  className="space-y-4"
                >
                  <FormField
                    control={form.control}
                    name="milestone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Milestone</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="E.g., Requirements Document"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="status"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Status</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select status" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="not_started">
                              Not Started
                            </SelectItem>
                            <SelectItem value="in_progress">
                              In Progress
                            </SelectItem>
                            <SelectItem value="completed">Completed</SelectItem>
                            <SelectItem value="delayed">Delayed</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="completionPercentage"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Completion Percentage</FormLabel>
                        <FormControl>
                          <Input type="number" min="0" max="100" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="feedback"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Feedback (Optional)</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Provide feedback on this milestone"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <Button
                    type="submit"
                    className="w-full"
                    disabled={submitting}
                  >
                    {submitting ? "Updating..." : "Update Progress"}
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Milestones History */}
      {teamDetails?.progressTracking?.milestones?.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Milestones History</CardTitle>
            <CardDescription>
              Track the progress of all team milestones
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Milestone</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Completion</TableHead>
                  <TableHead>Last Updated</TableHead>
                  <TableHead>Feedback</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {teamDetails.progressTracking.milestones.map(
                  (milestone, index) => (
                    <TableRow key={index}>
                      <TableCell className="font-medium">
                        {milestone.name}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          {getStatusIcon(milestone.status)}
                          <span>{milestone.status.replace("_", " ")}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Progress
                          value={milestone.progress || 0}
                          className="w-20 h-2"
                        />
                        <span className="text-xs">
                          {milestone.progress || 0}%
                        </span>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {new Date(milestone.lastUpdated).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="max-w-[200px] truncate">
                        {milestone.comments || "No feedback"}
                      </TableCell>
                    </TableRow>
                  )
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Supervisor Notes */}
      {teamDetails?.progressTracking?.supervisorNotes?.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Supervisor Notes</CardTitle>
            <CardDescription>
              Your notes and observations about this team
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Accordion type="single" collapsible className="w-full">
              {teamDetails.progressTracking.supervisorNotes.map(
                (note, index) => (
                  <AccordionItem key={index} value={`note-${index}`}>
                    <AccordionTrigger>
                      Note from {new Date(note.date).toLocaleDateString()}
                      <Badge
                        className="ml-2"
                        variant={
                          note.visibility === "private"
                            ? "outline"
                            : "secondary"
                        }
                      >
                        {note.visibility}
                      </Badge>
                    </AccordionTrigger>
                    <AccordionContent>{note.note}</AccordionContent>
                  </AccordionItem>
                )
              )}
            </Accordion>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
