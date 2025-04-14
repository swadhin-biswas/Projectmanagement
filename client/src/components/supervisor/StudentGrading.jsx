import {
  getAssignedStudents,
  getAssignedTeams,
  getTeamDetails,
  recordFeedback,
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
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import * as z from "zod";

const feedbackSchema = z.object({
  student: z.string(),
  milestone: z.string(),
  marks: z.coerce.number().min(0).max(100),
  comments: z.string().min(1, "Feedback comments are required"),
  categories: z
    .array(
      z.object({
        name: z.string(),
        score: z.coerce.number().min(0),
        maxScore: z.coerce.number().min(1),
        comments: z.string().optional(),
      })
    )
    .optional(),
});

const groupFeedbackSchema = z.object({
  team: z.string(),
  milestone: z.string(),
  marks: z.coerce.number().min(0).max(100),
  comments: z.string().min(1, "Feedback comments are required"),
  categoryScores: z.record(z.coerce.number().min(0)),
});

const ASSESSMENT_TYPES = [
  { id: "presentation", name: "Presentation" },
  { id: "viva", name: "Viva Voce" },
  { id: "report", name: "Report" },
  { id: "prototype", name: "Prototype/Demo" },
  { id: "implementation", name: "Implementation" },
  { id: "final", name: "Final Submission" },
];

const GRADING_CATEGORIES = {
  presentation: [
    { id: "content", name: "Content Quality", max: 30 },
    { id: "delivery", name: "Delivery & Communication", max: 30 },
    { id: "visual", name: "Visual Aids", max: 20 },
    { id: "questions", name: "Handling Questions", max: 20 },
  ],
  report: [
    { id: "content", name: "Content & Research", max: 40 },
    { id: "structure", name: "Structure & Organization", max: 20 },
    { id: "analysis", name: "Analysis & Discussion", max: 30 },
    { id: "language", name: "Language & References", max: 10 },
  ],
  viva: [
    { id: "knowledge", name: "Subject Knowledge", max: 40 },
    { id: "communication", name: "Communication", max: 20 },
    { id: "critical", name: "Critical Thinking", max: 40 },
  ],
  prototype: [
    { id: "functionality", name: "Functionality", max: 40 },
    { id: "ux", name: "User Experience", max: 30 },
    { id: "innovation", name: "Innovation", max: 30 },
  ],
  implementation: [
    { id: "code", name: "Code Quality", max: 30 },
    { id: "architecture", name: "Architecture", max: 25 },
    { id: "testing", name: "Testing", max: 25 },
    { id: "documentation", name: "Documentation", max: 20 },
  ],
  final: [
    { id: "requirements", name: "Requirements Fulfillment", max: 25 },
    { id: "quality", name: "Quality & Robustness", max: 25 },
    { id: "innovation", name: "Innovation & Creativity", max: 20 },
    { id: "documentation", name: "Documentation", max: 15 },
    { id: "presentation", name: "Presentation & Demo", max: 15 },
  ],
};

export default function StudentGrading() {
  const { toast } = useToast();
  const [teams, setTeams] = useState([]);
  const [students, setStudents] = useState([]);
  const [selectedTeam, setSelectedTeam] = useState(null);
  const [teamMembers, setTeamMembers] = useState([]);
  const [assessmentType, setAssessmentType] = useState("presentation");
  const [gradingMode, setGradingMode] = useState("individual");
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [recentGrades, setRecentGrades] = useState([]);

  const individualForm = useForm({
    resolver: zodResolver(feedbackSchema),
    defaultValues: {
      student: "",
      milestone: "",
      marks: 0,
      comments: "",
      categories: [],
    },
  });

  const groupForm = useForm({
    resolver: zodResolver(groupFeedbackSchema),
    defaultValues: {
      team: "",
      milestone: "",
      marks: 0,
      comments: "",
      categoryScores: {},
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
    // Reset forms when assessment type changes
    const categories = GRADING_CATEGORIES[assessmentType] || [];

    // Update individual form
    individualForm.setValue(
      "categories",
      categories.map((cat) => ({
        name: cat.name,
        score: 0,
        maxScore: cat.max,
        comments: "",
      }))
    );

    // Update group form
    const categoryScores = {};
    categories.forEach((cat) => {
      categoryScores[cat.id] = 0;
    });
    groupForm.setValue("categoryScores", categoryScores);

    // Set milestone based on assessment type
    const milestone =
      ASSESSMENT_TYPES.find((type) => type.id === assessmentType)?.name || "";
    individualForm.setValue("milestone", milestone);
    groupForm.setValue("milestone", milestone);
  }, [assessmentType]);

  const loadTeams = async () => {
    setLoading(true);
    try {
      const response = await getAssignedTeams();
      if (response.success) {
        setTeams(response.data.teams || []);
        if (response.data.teams?.length > 0) {
          setSelectedTeam(response.data.teams[0]._id);
          groupForm.setValue("team", response.data.teams[0]._id);
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

  const handleTeamChange = (teamId) => {
    setSelectedTeam(teamId);
    groupForm.setValue("team", teamId);
  };

  const calculateTotalScore = (categories) => {
    if (!categories || !categories.length) return 0;

    const totalEarned = categories.reduce(
      (sum, cat) => sum + (Number(cat.score) || 0),
      0
    );
    const totalPossible = categories.reduce(
      (sum, cat) => sum + (Number(cat.maxScore) || 0),
      0
    );

    return totalPossible > 0
      ? Math.round((totalEarned / totalPossible) * 100)
      : 0;
  };

  const handleIndividualSubmit = async (values) => {
    setSubmitting(true);
    try {
      // Calculate total marks based on category scores if categories present
      if (values.categories && values.categories.length > 0) {
        values.marks = calculateTotalScore(values.categories);
      }

      const response = await recordFeedback({
        ...values,
        project: selectedTeam, // Also associate with the project/team
      });

      if (response.success) {
        toast({
          title: "Feedback recorded",
          description: "The student grade has been submitted successfully.",
        });

        // Add to recent grades
        const student = students.find((s) => s._id === values.student);
        setRecentGrades((prev) => [
          {
            id: Date.now(),
            studentName: student?.fullName || "Student",
            milestone: values.milestone,
            marks: values.marks,
            date: new Date(),
          },
          ...prev.slice(0, 4), // Keep only 5 most recent
        ]);

        individualForm.reset({
          student: "",
          milestone: values.milestone,
          marks: 0,
          comments: "",
          categories: values.categories.map((cat) => ({
            ...cat,
            score: 0,
            comments: "",
          })),
        });
      }
    } catch (error) {
      toast({
        title: "Error recording feedback",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleGroupSubmit = async (values) => {
    setSubmitting(true);
    try {
      // Submit feedback for each team member
      const categories = Object.entries(values.categoryScores).map(
        ([id, score]) => {
          const category = GRADING_CATEGORIES[assessmentType]?.find(
            (cat) => cat.id === id
          );
          return {
            name: category?.name || id,
            score: score,
            maxScore: category?.max || 100,
            comments: "",
          };
        }
      );

      // Calculate total score
      const totalScore = calculateTotalScore(categories);

      // Process submissions for each team member
      const results = await Promise.all(
        teamMembers.map((member) =>
          recordFeedback({
            student: member.user._id,
            team: values.team,
            project: selectedTeam,
            milestone: values.milestone,
            marks: totalScore,
            comments: values.comments,
            categories: categories,
          })
        )
      );

      const success = results.every((res) => res.success);

      if (success) {
        toast({
          title: "Team grades submitted",
          description: `Grades for all ${teamMembers.length} team members have been recorded.`,
        });

        // Add to recent grades
        setRecentGrades((prev) => [
          {
            id: Date.now(),
            studentName: `Team (${teamMembers.length} members)`,
            milestone: values.milestone,
            marks: totalScore,
            date: new Date(),
          },
          ...prev.slice(0, 4), // Keep only 5 most recent
        ]);

        groupForm.reset({
          team: values.team,
          milestone: values.milestone,
          marks: 0,
          comments: "",
          categoryScores: Object.fromEntries(
            Object.keys(values.categoryScores).map((key) => [key, 0])
          ),
        });
      }
    } catch (error) {
      toast({
        title: "Error recording team feedback",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const renderCategoryFields = () => {
    const categories = GRADING_CATEGORIES[assessmentType] || [];

    if (gradingMode === "individual") {
      return (
        <div className="space-y-4 mt-4">
          <h3 className="text-md font-medium">Grading Criteria</h3>
          <div className="space-y-6">
            {categories.map((category, index) => (
              <div key={category.id} className="grid gap-2">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium">
                    {category.name} (max: {category.max})
                  </label>
                  <Input
                    type="number"
                    min="0"
                    max={category.max}
                    className="w-20"
                    {...individualForm.register(`categories.${index}.score`, {
                      valueAsNumber: true,
                    })}
                  />
                </div>
                <Textarea
                  placeholder={`Comments for ${category.name}`}
                  className="h-16"
                  {...individualForm.register(`categories.${index}.comments`)}
                />
                <input
                  type="hidden"
                  {...individualForm.register(`categories.${index}.name`)}
                  value={category.name}
                />
                <input
                  type="hidden"
                  {...individualForm.register(`categories.${index}.maxScore`)}
                  value={category.max}
                />
              </div>
            ))}
          </div>
        </div>
      );
    } else {
      return (
        <div className="space-y-4 mt-4">
          <h3 className="text-md font-medium">Team Grading Criteria</h3>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Criteria</TableHead>
                <TableHead>Max Score</TableHead>
                <TableHead>Score</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {categories.map((category) => (
                <TableRow key={category.id}>
                  <TableCell>{category.name}</TableCell>
                  <TableCell>{category.max}</TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      min="0"
                      max={category.max}
                      className="w-20"
                      {...groupForm.register(`categoryScores.${category.id}`, {
                        valueAsNumber: true,
                      })}
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      );
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Student Assessment</h2>
        <Select value={assessmentType} onValueChange={setAssessmentType}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Select assessment type" />
          </SelectTrigger>
          <SelectContent>
            {ASSESSMENT_TYPES.map((type) => (
              <SelectItem key={type.id} value={type.id}>
                {type.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Tabs value={gradingMode} onValueChange={setGradingMode}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="individual">Individual Grading</TabsTrigger>
          <TabsTrigger value="group">Group Grading</TabsTrigger>
        </TabsList>

        <TabsContent value="individual" className="space-y-4 pt-4">
          <Card>
            <CardHeader>
              <CardTitle>Individual Student Assessment</CardTitle>
              <CardDescription>
                Grade individual students on their performance
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...individualForm}>
                <form
                  onSubmit={individualForm.handleSubmit(handleIndividualSubmit)}
                  className="space-y-6"
                >
                  <FormField
                    control={individualForm.control}
                    name="student"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Student</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select student" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {students.map((student) => (
                              <SelectItem key={student._id} value={student._id}>
                                {student.fullName}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={individualForm.control}
                    name="milestone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Assessment Title</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="E.g., Midterm Presentation"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {renderCategoryFields()}

                  <FormField
                    control={individualForm.control}
                    name="comments"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Overall Feedback</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Provide detailed feedback for the student"
                            className="min-h-[120px]"
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
                    {submitting ? "Submitting..." : "Submit Assessment"}
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="group" className="space-y-4 pt-4">
          <Card>
            <CardHeader>
              <CardTitle>Team Assessment</CardTitle>
              <CardDescription>
                Assess entire teams on their work
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...groupForm}>
                <form
                  onSubmit={groupForm.handleSubmit(handleGroupSubmit)}
                  className="space-y-6"
                >
                  <FormField
                    control={groupForm.control}
                    name="team"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Team</FormLabel>
                        <Select
                          onValueChange={(value) => {
                            field.onChange(value);
                            handleTeamChange(value);
                          }}
                          value={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select team" />
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

                  {selectedTeam && teamMembers.length > 0 && (
                    <div>
                      <FormLabel>Team Members ({teamMembers.length})</FormLabel>
                      <div className="flex flex-wrap gap-2 mt-2">
                        {teamMembers.map((member) => (
                          <Badge variant="outline" key={member.user._id}>
                            {member.user.fullName}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  <FormField
                    control={groupForm.control}
                    name="milestone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Assessment Title</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="E.g., Final Project Presentation"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {renderCategoryFields()}

                  <FormField
                    control={groupForm.control}
                    name="comments"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Team Feedback</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Provide detailed feedback for the entire team"
                            className="min-h-[120px]"
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
                    {submitting
                      ? "Submitting..."
                      : "Submit Assessment for All Team Members"}
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {recentGrades.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Recently Submitted Grades</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Student/Team</TableHead>
                  <TableHead>Assessment</TableHead>
                  <TableHead>Score</TableHead>
                  <TableHead>Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentGrades.map((grade) => (
                  <TableRow key={grade.id}>
                    <TableCell>{grade.studentName}</TableCell>
                    <TableCell>{grade.milestone}</TableCell>
                    <TableCell>{grade.marks}%</TableCell>
                    <TableCell>
                      {grade.date.toLocaleDateString()}{" "}
                      {grade.date.toLocaleTimeString([], {
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
