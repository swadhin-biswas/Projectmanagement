import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { format, isAfter, isBefore, addDays } from "date-fns";
import {
  Calendar,
  ChevronDown,
  Clock,
  Flag,
  GripHorizontal,
  Plus,
  RotateCcw,
  Save,
  Trash2,
  Users
} from "lucide-react";
import { api } from "../../lib/api";
import { Button } from "../ui/button";
import { Checkbox } from "../ui/checkbox";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Textarea } from "../ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle
} from "../ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from "../ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "../ui/select";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger
} from "../ui/tabs";
import { RadioGroup, RadioGroupItem } from "../ui/radio-group";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "../ui/tooltip";
import { Badge } from "../ui/badge";
import { ScrollArea } from "../ui/scroll-area";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger
} from "../ui/accordion";

const TimelineManager = ({ sessionId }) => {
  const queryClient = useQueryClient();
  const [activeView, setActiveView] = useState("timeline");
  const [showAddTaskDialog, setShowAddTaskDialog] = useState(false);
  const [showAddSegmentDialog, setShowAddSegmentDialog] = useState(false);
  const [selectedSegment, setSelectedSegment] = useState(null);
  const [newTask, setNewTask] = useState({
    title: "",
    description: "",
    startDate: "",
    dueDate: "",
    type: "milestone",
    priority: "medium",
    assignToRoles: ["student"],
    notifyBefore: 3,
  });
  const [newSegment, setNewSegment] = useState({
    name: "",
    description: "",
    startDate: "",
    endDate: "",
    color: "#3498db",
  });

  // Task types with more options
  const taskTypes = [
    { value: "milestone", label: "Major Milestone", icon: Flag },
    { value: "submission", label: "Project Submission", icon: Clock },
    { value: "meeting", label: "Meeting/Presentation", icon: Users },
    { value: "feedback", label: "Feedback Session", icon: Clock },
    { value: "review", label: "Review Phase", icon: Clock },
    { value: "workshop", label: "Workshop/Training", icon: Users },
  ];

  // Priority options
  const priorities = [
    { value: "low", label: "Low", color: "#94a3b8" },
    { value: "medium", label: "Medium", color: "#60a5fa" },
    { value: "high", label: "High", color: "#f97316" },
    { value: "critical", label: "Critical", color: "#ef4444" },
  ];

  // Role options for assigning tasks
  const roles = [
    { value: "student", label: "Students" },
    { value: "supervisor", label: "Supervisors" },
    { value: "admin", label: "Administrators" },
  ];

  // Fetch timeline data
  const { data: timeline, isLoading } = useQuery({
    queryKey: ["timeline", sessionId],
    queryFn: async () => {
      if (!sessionId) return { segments: [] };
      const response = await api.get(`/api/timeline/${sessionId}`);
      return response.data.data;
    },
    enabled: !!sessionId,
  });

  // Add segment mutation
  const addSegmentMutation = useMutation({
    mutationFn: async (segmentData) => {
      return api.post(`/api/timeline/${sessionId}/segments`, segmentData);
    },
    onSuccess: () => {
      toast.success("Timeline segment added successfully");
      setShowAddSegmentDialog(false);
      queryClient.invalidateQueries(["timeline", sessionId]);
      resetSegmentForm();
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || "Failed to add segment");
    },
  });

  // Add task mutation
  const addTaskMutation = useMutation({
    mutationFn: async (data) => {
      return api.post(`/api/timeline/${sessionId}/segments/${selectedSegment}/tasks`, data);
    },
    onSuccess: () => {
      toast.success("Task added successfully");
      setShowAddTaskDialog(false);
      queryClient.invalidateQueries(["timeline", sessionId]);
      resetTaskForm();
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || "Failed to add task");
    },
  });

  // Update segment mutation
  const updateSegmentMutation = useMutation({
    mutationFn: async ({ segmentId, data }) => {
      return api.put(`/api/timeline/${sessionId}/segments/${segmentId}`, data);
    },
    onSuccess: () => {
      toast.success("Segment updated successfully");
      queryClient.invalidateQueries(["timeline", sessionId]);
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || "Failed to update segment");
    },
  });

  // Delete segment mutation
  const deleteSegmentMutation = useMutation({
    mutationFn: async (segmentId) => {
      return api.delete(`/api/timeline/${sessionId}/segments/${segmentId}`);
    },
    onSuccess: () => {
      toast.success("Segment deleted successfully");
      queryClient.invalidateQueries(["timeline", sessionId]);
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || "Failed to delete segment");
    },
  });

  // Helper function to reset task form
  const resetTaskForm = () => {
    setNewTask({
      title: "",
      description: "",
      startDate: "",
      dueDate: "",
      type: "milestone",
      priority: "medium",
      assignToRoles: ["student"],
      notifyBefore: 3,
    });
  };

  // Helper function to reset segment form
  const resetSegmentForm = () => {
    setNewSegment({
      name: "",
      description: "",
      startDate: "",
      endDate: "",
      color: "#3498db",
    });
  };

  // Handle adding a new segment
  const handleAddSegment = (e) => {
    e.preventDefault();
    addSegmentMutation.mutate(newSegment);
  };

  // Handle adding a new task
  const handleAddTask = (e) => {
    e.preventDefault();
    addTaskMutation.mutate(newTask);
  };

  // Handle opening task dialog for a specific segment
  const handleOpenTaskDialog = (segmentId) => {
    setSelectedSegment(segmentId);
    setShowAddTaskDialog(true);
  };

  // Calculate timeline position for visualization
  const calculateTimelinePosition = (date, startDate, endDate) => {
    if (!startDate || !endDate) return 0;

    const start = new Date(startDate);
    const end = new Date(endDate);
    const target = new Date(date);

    if (isBefore(target, start)) return 0;
    if (isAfter(target, end)) return 100;

    const totalDuration = end - start;
    const position = target - start;

    return Math.round((position / totalDuration) * 100);
  };

  // Get task status based on dates
  const getTaskStatus = (task) => {
    const now = new Date();
    const startDate = new Date(task.startDate);
    const dueDate = new Date(task.dueDate);

    if (task.status === "completed") return "completed";
    if (isAfter(now, dueDate)) return "overdue";
    if (isAfter(now, startDate) && isBefore(now, dueDate)) return "in-progress";
    return "upcoming";
  };

  // Get color for task status
  const getStatusColor = (status) => {
    switch (status) {
      case "completed": return "bg-green-500";
      case "overdue": return "bg-red-500";
      case "in-progress": return "bg-blue-500";
      case "upcoming": return "bg-gray-400";
      default: return "bg-gray-400";
    }
  };

  // Get task type icon
  const getTaskTypeIcon = (type) => {
    const taskType = taskTypes.find(t => t.value === type);
    const Icon = taskType?.icon || Flag;
    return <Icon className="h-4 w-4" />;
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Session Timeline Manager</CardTitle>
            <CardDescription>
              Create and manage the timeline for the current academic session
            </CardDescription>
          </div>
          <div className="flex space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowAddSegmentDialog(true)}
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Timeline Segment
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs value={activeView} onValueChange={setActiveView} className="mb-4">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="timeline" className="flex items-center gap-2">
              <Flag className="h-4 w-4" /> Timeline View
            </TabsTrigger>
            <TabsTrigger value="calendar" className="flex items-center gap-2">
              <Calendar className="h-4 w-4" /> Calendar View
            </TabsTrigger>
            <TabsTrigger value="list" className="flex items-center gap-2">
              <GripHorizontal className="h-4 w-4" /> List View
            </TabsTrigger>
          </TabsList>
        </Tabs>

        {isLoading ? (
          <div className="flex justify-center items-center py-10">
            <p className="text-gray-500">Loading timeline data...</p>
          </div>
        ) : (
          <>
            {/* Timeline View */}
            <TabsContent value="timeline" className="mt-0">
              <div className="space-y-8">
                {timeline?.segments?.length > 0 ? (
                  timeline.segments.map((segment, index) => (
                    <div key={segment._id || index} className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center">
                          <div
                            className="w-4 h-4 rounded-full mr-2"
                            style={{ backgroundColor: segment.color }}
                          />
                          <h3 className="text-lg font-semibold">{segment.name}</h3>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleOpenTaskDialog(segment._id)}
                          >
                            <Plus className="h-4 w-4 mr-1" />
                            Add Task
                          </Button>
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button size="sm" variant="ghost">
                                <ChevronDown className="h-4 w-4" />
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-48">
                              <div className="space-y-2">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="w-full justify-start text-red-500"
                                  onClick={() => {
                                    if (confirm("Are you sure you want to delete this segment?")) {
                                      deleteSegmentMutation.mutate(segment._id);
                                    }
                                  }}
                                >
                                  <Trash2 className="h-4 w-4 mr-2" />
                                  Delete Segment
                                </Button>
                              </div>
                            </PopoverContent>
                          </Popover>
                        </div>
                      </div>
                      <div className="text-sm text-gray-500 flex items-center justify-between">
                        <div>
                          {format(new Date(segment.startDate), "MMM d, yyyy")} - {format(new Date(segment.endDate), "MMM d, yyyy")}
                        </div>
                        <div className="text-xs">
                          {segment.tasks?.length || 0} tasks
                        </div>
                      </div>
                      <div className="relative mt-6 mb-8">
                        {/* Segment timeline */}
                        <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full w-full relative">
                          {/* Current date marker */}
                          <div
                            className="absolute top-0 w-0.5 h-2 bg-red-500 z-10"
                            style={{
                              left: `${calculateTimelinePosition(
                                new Date(),
                                segment.startDate,
                                segment.endDate
                              )}%`,
                            }}
                          />
                        </div>

                        {/* Tasks on timeline */}
                        <div className="mt-4">
                          {segment.tasks?.map((task, taskIndex) => {
                            const position = calculateTimelinePosition(
                              task.dueDate,
                              segment.startDate,
                              segment.endDate
                            );
                            const status = getTaskStatus(task);

                            return (
                              <TooltipProvider key={task._id || taskIndex}>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <div
                                      className={`absolute -mt-6 transform -translate-x-1/2 flex flex-col items-center`}
                                      style={{ left: `${position}%` }}
                                    >
                                      <div className={`w-4 h-4 rounded-full ${getStatusColor(status)}`}>
                                        {task.status === "completed" && (
                                          <div className="w-2 h-2 rounded-full bg-white absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2" />
                                        )}
                                      </div>
                                      <div className="mt-1 whitespace-nowrap text-xs font-medium">
                                        {getTaskTypeIcon(task.type)}
                                      </div>
                                    </div>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <div className="space-y-1">
                                      <p className="font-medium">{task.title}</p>
                                      <p className="text-xs">
                                        Due: {format(new Date(task.dueDate), "MMM d, yyyy")}
                                      </p>
                                      <Badge
                                        variant="outline"
                                        className={
                                          status === "completed" ? "bg-green-100 text-green-800" :
                                          status === "overdue" ? "bg-red-100 text-red-800" :
                                          status === "in-progress" ? "bg-blue-100 text-blue-800" :
                                          "bg-gray-100 text-gray-800"
                                        }
                                      >
                                        {status.replace("-", " ")}
                                      </Badge>
                                    </div>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            );
                          })}
                        </div>
                      </div>

                      {/* Task details accordion */}
                      <Accordion type="single" collapsible className="w-full">
                        <AccordionItem value="tasks">
                          <AccordionTrigger>
                            View Tasks ({segment.tasks?.length || 0})
                          </AccordionTrigger>
                          <AccordionContent>
                            <div className="space-y-2 mt-2">
                              {segment.tasks?.length > 0 ? (
                                segment.tasks.map((task, taskIndex) => {
                                  const status = getTaskStatus(task);
                                  const statusColor =
                                    status === "completed" ? "border-green-200 bg-green-50" :
                                    status === "overdue" ? "border-red-200 bg-red-50" :
                                    status === "in-progress" ? "border-blue-200 bg-blue-50" :
                                    "border-gray-200 bg-gray-50";

                                  return (
                                    <div
                                      key={task._id || taskIndex}
                                      className={`p-3 rounded-md border ${statusColor} dark:bg-opacity-10`}
                                    >
                                      <div className="flex justify-between">
                                        <div className="flex items-center gap-2">
                                          <div className={`w-3 h-3 rounded-full ${getStatusColor(status)}`} />
                                          <h4 className="font-medium">{task.title}</h4>
                                          <Badge variant="outline" className="ml-2">
                                            {taskTypes.find(t => t.value === task.type)?.label || task.type}
                                          </Badge>
                                        </div>
                                        <Badge variant={task.priority === "critical" ? "destructive" : "secondary"}>
                                          {task.priority}
                                        </Badge>
                                      </div>

                                      <p className="text-sm text-gray-500 mt-1">{task.description}</p>

                                      <div className="flex items-center text-xs text-gray-500 mt-2">
                                        <Calendar className="h-3 w-3 mr-1" />
                                        <span>
                                          {format(new Date(task.startDate), "MMM d")} - {format(new Date(task.dueDate), "MMM d, yyyy")}
                                        </span>
                                      </div>

                                      <div className="flex mt-2 gap-1">
                                        {task.assignToRoles?.map(role => (
                                          <Badge key={role} variant="outline" className="text-xs">
                                            {role}
                                          </Badge>
                                        ))}
                                      </div>
                                    </div>
                                  );
                                })
                              ) : (
                                <p className="text-sm text-gray-500 py-2">No tasks in this segment yet</p>
                              )}

                              <Button
                                variant="ghost"
                                size="sm"
                                className="mt-2 w-full"
                                onClick={() => handleOpenTaskDialog(segment._id)}
                              >
                                <Plus className="h-4 w-4 mr-2" />
                                Add Task
                              </Button>
                            </div>
                          </AccordionContent>
                        </AccordionItem>
                      </Accordion>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-10">
                    <p className="text-gray-500 mb-4">No timeline segments yet</p>
                    <Button onClick={() => setShowAddSegmentDialog(true)}>
                      <Plus className="h-4 w-4 mr-2" />
                      Create First Segment
                    </Button>
                  </div>
                )}
              </div>
            </TabsContent>

            {/* Calendar View - Simplified for brevity */}
            <TabsContent value="calendar" className="mt-0">
              <div className="text-center py-6">
                <p className="text-gray-500">Calendar view would display timeline events by month</p>
              </div>
            </TabsContent>

            {/* List View - Simplified for brevity */}
            <TabsContent value="list" className="mt-0">
              <div className="space-y-6">
                {timeline?.segments?.map((segment, index) => (
                  <Card key={segment._id || index}>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-lg flex items-center">
                        <div
                          className="w-4 h-4 rounded-full mr-2"
                          style={{ backgroundColor: segment.color }}
                        />
                        {segment.name}
                      </CardTitle>
                      <CardDescription>
                        {format(new Date(segment.startDate), "MMM d, yyyy")} - {format(new Date(segment.endDate), "MMM d, yyyy")}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      {segment.tasks?.length > 0 ? (
                        <div className="space-y-2">
                          {segment.tasks.map((task, taskIndex) => (
                            <div
                              key={task._id || taskIndex}
                              className="flex items-center justify-between p-2 rounded-md border border-gray-200 dark:border-gray-700"
                            >
                              <div className="flex items-center gap-2">
                                <div className={`w-3 h-3 rounded-full ${getStatusColor(getTaskStatus(task))}`} />
                                <span>{task.title}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <Badge variant="outline">
                                  {format(new Date(task.dueDate), "MMM d")}
                                </Badge>
                                {getTaskTypeIcon(task.type)}
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-gray-500">No tasks in this segment</p>
                      )}
                    </CardContent>
                    <CardFooter>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleOpenTaskDialog(segment._id)}
                      >
                        <Plus className="h-4 w-4 mr-1" />
                        Add Task
                      </Button>
                    </CardFooter>
                  </Card>
                ))}
              </div>
            </TabsContent>
          </>
        )}
      </CardContent>

      {/* Add Segment Dialog */}
      <Dialog open={showAddSegmentDialog} onOpenChange={setShowAddSegmentDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Timeline Segment</DialogTitle>
            <DialogDescription>
              Create a new segment in the session timeline
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleAddSegment}>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="segment-name" className="text-right">
                  Name
                </Label>
                <Input
                  id="segment-name"
                  value={newSegment.name}
                  onChange={(e) => setNewSegment({ ...newSegment, name: e.target.value })}
                  className="col-span-3"
                  placeholder="e.g. Project Preparation Phase"
                  required
                />
              </div>

              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="segment-description" className="text-right">
                  Description
                </Label>
                <Textarea
                  id="segment-description"
                  value={newSegment.description}
                  onChange={(e) => setNewSegment({ ...newSegment, description: e.target.value })}
                  className="col-span-3"
                  placeholder="Brief description of this timeline segment"
                />
              </div>

              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="segment-start-date" className="text-right">
                  Start Date
                </Label>
                <Input
                  id="segment-start-date"
                  type="date"
                  value={newSegment.startDate}
                  onChange={(e) => setNewSegment({ ...newSegment, startDate: e.target.value })}
                  className="col-span-3"
                  required
                />
              </div>

              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="segment-end-date" className="text-right">
                  End Date
                </Label>
                <Input
                  id="segment-end-date"
                  type="date"
                  value={newSegment.endDate}
                  onChange={(e) => setNewSegment({ ...newSegment, endDate: e.target.value })}
                  className="col-span-3"
                  required
                />
              </div>

              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="segment-color" className="text-right">
                  Color
                </Label>
                <div className="col-span-3 flex items-center gap-2">
                  <Input
                    id="segment-color"
                    type="color"
                    value={newSegment.color}
                    onChange={(e) => setNewSegment({ ...newSegment, color: e.target.value })}
                    className="w-10 h-10 p-1 rounded cursor-pointer"
                  />
                  <span className="text-sm text-gray-500">Choose a color for this segment</span>
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setShowAddSegmentDialog(false);
                  resetSegmentForm();
                }}
              >
                Cancel
              </Button>
              <Button type="submit">
                <Plus className="h-4 w-4 mr-2" />
                Add Segment
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Add Task Dialog */}
      <Dialog open={showAddTaskDialog} onOpenChange={setShowAddTaskDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Add Task to Timeline</DialogTitle>
            <DialogDescription>
              Create a new task in the selected timeline segment
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleAddTask}>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="task-title" className="text-right">
                  Title
                </Label>
                <Input
                  id="task-title"
                  value={newTask.title}
                  onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                  className="col-span-3"
                  placeholder="e.g. Submit Project Proposal"
                  required
                />
              </div>

              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="task-description" className="text-right">
                  Description
                </Label>
                <Textarea
                  id="task-description"
                  value={newTask.description}
                  onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
                  className="col-span-3"
                  placeholder="Detailed description of this task"
                />
              </div>

              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="task-type" className="text-right">
                  Type
                </Label>
                <Select
                  value={newTask.type}
                  onValueChange={(value) => setNewTask({ ...newTask, type: value })}
                >
                  <SelectTrigger id="task-type" className="col-span-3">
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    {taskTypes.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        <div className="flex items-center">
                          <type.icon className="h-4 w-4 mr-2" />
                          {type.label}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="task-priority" className="text-right">
                  Priority
                </Label>
                <Select
                  value={newTask.priority}
                  onValueChange={(value) => setNewTask({ ...newTask, priority: value })}
                >
                  <SelectTrigger id="task-priority" className="col-span-3">
                    <SelectValue placeholder="Select priority" />
                  </SelectTrigger>
                  <SelectContent>
                    {priorities.map((priority) => (
                      <SelectItem key={priority.value} value={priority.value}>
                        <div className="flex items-center">
                          <div
                            className="w-3 h-3 rounded-full mr-2"
                            style={{ backgroundColor: priority.color }}
                          />
                          {priority.label}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="task-start-date" className="text-right">
                  Start Date
                </Label>
                <Input
                  id="task-start-date"
                  type="date"
                  value={newTask.startDate}
                  onChange={(e) => setNewTask({ ...newTask, startDate: e.target.value })}
                  className="col-span-3"
                  required
                />
              </div>

              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="task-due-date" className="text-right">
                  Due Date
                </Label>
                <Input
                  id="task-due-date"
                  type="date"
                  value={newTask.dueDate}
                  onChange={(e) => setNewTask({ ...newTask, dueDate: e.target.value })}
                  className="col-span-3"
                  required
                />
              </div>

              <div className="grid grid-cols-4 items-start gap-4">
                <Label className="text-right pt-2">
                  Assign To
                </Label>
                <div className="col-span-3 space-y-2">
                  {roles.map((role) => (
                    <div key={role.value} className="flex items-center space-x-2">
                      <Checkbox
                        id={`role-${role.value}`}
                        checked={newTask.assignToRoles.includes(role.value)}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setNewTask({
                              ...newTask,
                              assignToRoles: [...newTask.assignToRoles, role.value],
                            });
                          } else {
                            setNewTask({
                              ...newTask,
                              assignToRoles: newTask.assignToRoles.filter(r => r !== role.value),
                            });
                          }
                        }}
                      />
                      <Label htmlFor={`role-${role.value}`}>{role.label}</Label>
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="notify-before" className="text-right">
                  Notify Before (days)
                </Label>
                <Input
                  id="notify-before"
                  type="number"
                  min="0"
                  max="30"
                  value={newTask.notifyBefore}
                  onChange={(e) => setNewTask({ ...newTask, notifyBefore: parseInt(e.target.value) })}
                  className="col-span-3"
                />
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setShowAddTaskDialog(false);
                  resetTaskForm();
                }}
              >
                Cancel
              </Button>
              <Button type="submit">
                <Plus className="h-4 w-4 mr-2" />
                Add Task
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </Card>
  );
};

export default TimelineManager;