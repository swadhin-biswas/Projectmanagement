import { useQuery } from "@tanstack/react-query";
import { addDays, format, isAfter, isBefore } from "date-fns";
import { Calendar, Flag, Loader2 } from "lucide-react";
import { useState } from "react";
import { api } from "../../lib/api";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import {
  Dialog,
  DialogContent,
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";

const SessionTimelineVisualizer = ({ sessionId }) => {
  const [showAddDeadlineDialog, setShowAddDeadlineDialog] = useState(false);
  const [activeView, setActiveView] = useState("timeline");
  const [newDeadline, setNewDeadline] = useState({
    name: "",
    description: "",
    date: "",
    type: "submission",
    notifyBefore: 7,
  });

  // Fetch session details with deadlines
  const {
    data: session,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ["session-timeline", sessionId],
    queryFn: async () => {
      if (!sessionId) return null;
      const response = await api.get(`/api/sessions/${sessionId}`);
      return response.data.data;
    },
    enabled: !!sessionId,
  });

  const handleAddDeadline = async (e) => {
    e.preventDefault();
    try {
      await api.post(`/api/admin/sessions/${sessionId}/deadlines`, newDeadline);
      setShowAddDeadlineDialog(false);
      refetch();
    } catch (error) {
      console.error("Failed to add deadline:", error);
    }
  };

  // Calculate where each deadline should appear in the timeline
  const calculateTimelinePosition = (date) => {
    if (!session) return 0;

    const startDate = new Date(session.startDate);
    const endDate = new Date(session.endDate);
    const deadlineDate = new Date(date);

    if (isBefore(deadlineDate, startDate)) return 0;
    if (isAfter(deadlineDate, endDate)) return 100;

    const totalDuration = endDate - startDate;
    const deadlinePosition = deadlineDate - startDate;

    return Math.round((deadlinePosition / totalDuration) * 100);
  };

  // Group deadlines by month for calendar view
  const groupDeadlinesByMonth = () => {
    if (!session?.deadlines) return {};

    return session.deadlines.reduce((acc, deadline) => {
      const date = new Date(deadline.date);
      const month = format(date, "MMMM yyyy");

      if (!acc[month]) {
        acc[month] = [];
      }

      acc[month].push(deadline);
      return acc;
    }, {});
  };

  // Get deadline type badge
  const getDeadlineTypeBadge = (type) => {
    switch (type) {
      case "submission":
        return <Badge className="bg-blue-500">Submission</Badge>;
      case "presentation":
        return <Badge className="bg-purple-500">Presentation</Badge>;
      case "report":
        return <Badge className="bg-green-500">Report</Badge>;
      case "meeting":
        return <Badge className="bg-yellow-500">Meeting</Badge>;
      case "review":
        return <Badge className="bg-orange-500">Review</Badge>;
      default:
        return <Badge className="bg-gray-500">{type}</Badge>;
    }
  };

  // Check if deadline is past, current or upcoming
  const getDeadlineStatus = (date) => {
    const now = new Date();
    const deadlineDate = new Date(date);
    const isOverdue = isBefore(deadlineDate, now);
    const isUpcoming =
      isBefore(now, deadlineDate) && isBefore(now, addDays(deadlineDate, 7));

    if (isOverdue) return "overdue";
    if (isUpcoming) return "upcoming";
    return "future";
  };

  if (isLoading) {
    return (
      <div className="flex justify-center p-6">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
      </div>
    );
  }

  if (!session) {
    return (
      <div className="text-center p-6 text-gray-500">
        No session selected or session data not available
      </div>
    );
  }

  const groupedDeadlines = groupDeadlinesByMonth();

  return (
    <Card className="w-full">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-xl">Session Timeline</CardTitle>
        <Button
          variant="outline"
          className="flex items-center gap-1"
          onClick={() => setShowAddDeadlineDialog(true)}
        >
          <Flag className="h-4 w-4" /> Add Deadline
        </Button>
      </CardHeader>

      <CardContent>
        <Tabs
          defaultValue={activeView}
          onValueChange={setActiveView}
          className="mb-4"
        >
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="timeline" className="flex items-center gap-2">
              <Flag className="h-4 w-4" /> Timeline View
            </TabsTrigger>
            <TabsTrigger value="calendar" className="flex items-center gap-2">
              <Calendar className="h-4 w-4" /> Calendar View
            </TabsTrigger>
          </TabsList>
        </Tabs>

        <TabsContent value="timeline" className="mt-0">
          <div className="relative mt-8 mb-12">
            {/* Session duration line */}
            <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full w-full relative">
              {/* Current date marker */}
              <div
                className="absolute top-0 w-0.5 h-2 bg-red-500 z-10"
                style={{
                  left: `${calculateTimelinePosition(new Date())}%`,
                }}
              />

              {/* Progress bar */}
              <div
                className="absolute top-0 left-0 h-2 bg-blue-500 rounded-full"
                style={{ width: `${calculateTimelinePosition(new Date())}%` }}
              />

              {/* Session start marker */}
              <div className="absolute -top-2 -left-1 w-4 h-4 rounded-full bg-green-500" />

              {/* Session end marker */}
              <div className="absolute -top-2 -right-1 w-4 h-4 rounded-full bg-red-500" />
            </div>

            {/* Timeline labels */}
            <div className="flex justify-between mt-1 mb-6 text-xs text-gray-500">
              <div>
                Start: {format(new Date(session.startDate), "MMM d, yyyy")}
              </div>
              <div>End: {format(new Date(session.endDate), "MMM d, yyyy")}</div>
            </div>
          </div>

          {/* Deadlines */}
          <div className="relative">
            {session.deadlines?.length > 0 ? (
              session.deadlines.map((deadline, index) => {
                const position = calculateTimelinePosition(deadline.date);
                const status = getDeadlineStatus(deadline.date);

                return (
                  <div
                    key={index}
                    className="mb-6 pl-6 border-l-2 relative"
                    style={{
                      borderColor:
                        status === "overdue"
                          ? "#ef4444"
                          : status === "upcoming"
                          ? "#f59e0b"
                          : "#6b7280",
                    }}
                  >
                    {/* Position indicator on the timeline */}
                    <div
                      className="absolute -left-1.5 top-1.5 w-3 h-3 rounded-full"
                      style={{
                        backgroundColor:
                          status === "overdue"
                            ? "#ef4444"
                            : status === "upcoming"
                            ? "#f59e0b"
                            : "#6b7280",
                      }}
                    />

                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{deadline.name}</span>
                        {getDeadlineTypeBadge(deadline.type)}
                        <Badge
                          className={
                            status === "overdue"
                              ? "bg-red-500"
                              : status === "upcoming"
                              ? "bg-yellow-500"
                              : "bg-gray-500"
                          }
                        >
                          {status === "overdue"
                            ? "Overdue"
                            : status === "upcoming"
                            ? "Upcoming"
                            : "Future"}
                        </Badge>
                      </div>
                      <div className="text-sm text-gray-500">
                        {format(new Date(deadline.date), "MMMM d, yyyy")}
                      </div>
                      {deadline.description && (
                        <div className="text-sm mt-1">
                          {deadline.description}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="text-center py-8 text-gray-500">
                No deadlines set for this session
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="calendar" className="mt-0">
          {Object.keys(groupedDeadlines).length > 0 ? (
            Object.entries(groupedDeadlines).map(([month, deadlines]) => (
              <div key={month} className="mb-8">
                <h3 className="text-lg font-semibold mb-4">{month}</h3>
                <div className="space-y-3">
                  {deadlines.map((deadline, index) => {
                    const status = getDeadlineStatus(deadline.date);

                    return (
                      <div
                        key={index}
                        className={`p-3 rounded-lg border ${
                          status === "overdue"
                            ? "border-red-200 bg-red-50 dark:bg-red-900/10"
                            : status === "upcoming"
                            ? "border-yellow-200 bg-yellow-50 dark:bg-yellow-900/10"
                            : "border-gray-200 bg-gray-50 dark:bg-gray-800/50"
                        }`}
                      >
                        <div className="flex justify-between items-start">
                          <div>
                            <div className="font-medium">{deadline.name}</div>
                            <div className="text-sm text-gray-500">
                              {format(
                                new Date(deadline.date),
                                "EEEE, MMMM d, yyyy"
                              )}
                            </div>
                            {deadline.description && (
                              <div className="text-sm mt-1">
                                {deadline.description}
                              </div>
                            )}
                          </div>
                          <div className="flex flex-col gap-1 items-end">
                            {getDeadlineTypeBadge(deadline.type)}
                            <Badge
                              className={
                                status === "overdue"
                                  ? "bg-red-500"
                                  : status === "upcoming"
                                  ? "bg-yellow-500"
                                  : "bg-gray-500"
                              }
                            >
                              {status === "overdue"
                                ? "Overdue"
                                : status === "upcoming"
                                ? "Upcoming"
                                : "Future"}
                            </Badge>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-8 text-gray-500">
              No deadlines set for this session
            </div>
          )}
        </TabsContent>
      </CardContent>

      <Dialog
        open={showAddDeadlineDialog}
        onOpenChange={setShowAddDeadlineDialog}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Deadline</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleAddDeadline}>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="deadline-name" className="text-right">
                  Name
                </Label>
                <Input
                  id="deadline-name"
                  value={newDeadline.name}
                  onChange={(e) =>
                    setNewDeadline({ ...newDeadline, name: e.target.value })
                  }
                  placeholder="e.g. Project Proposal Submission"
                  className="col-span-3"
                  required
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="deadline-date" className="text-right">
                  Date
                </Label>
                <Input
                  id="deadline-date"
                  type="date"
                  value={newDeadline.date}
                  onChange={(e) =>
                    setNewDeadline({ ...newDeadline, date: e.target.value })
                  }
                  className="col-span-3"
                  required
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="deadline-type" className="text-right">
                  Type
                </Label>
                <Select
                  value={newDeadline.type}
                  onValueChange={(value) =>
                    setNewDeadline({ ...newDeadline, type: value })
                  }
                >
                  <SelectTrigger id="deadline-type" className="col-span-3">
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="submission">Submission</SelectItem>
                    <SelectItem value="presentation">Presentation</SelectItem>
                    <SelectItem value="report">Report</SelectItem>
                    <SelectItem value="meeting">Meeting</SelectItem>
                    <SelectItem value="review">Review</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="notify-before" className="text-right">
                  Notify Before (days)
                </Label>
                <Input
                  id="notify-before"
                  type="number"
                  min="1"
                  max="30"
                  value={newDeadline.notifyBefore}
                  onChange={(e) =>
                    setNewDeadline({
                      ...newDeadline,
                      notifyBefore: parseInt(e.target.value),
                    })
                  }
                  className="col-span-3"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="deadline-description" className="text-right">
                  Description
                </Label>
                <textarea
                  id="deadline-description"
                  value={newDeadline.description}
                  onChange={(e) =>
                    setNewDeadline({
                      ...newDeadline,
                      description: e.target.value,
                    })
                  }
                  placeholder="Detailed description of this deadline"
                  className="col-span-3 min-h-[80px] px-3 py-2 text-sm rounded-md border border-gray-300 dark:border-gray-700 dark:bg-gray-800"
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowAddDeadlineDialog(false)}
              >
                Cancel
              </Button>
              <Button type="submit">Save Deadline</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </Card>
  );
};

export default SessionTimelineVisualizer;
