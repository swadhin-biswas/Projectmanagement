import React, { useEffect, useState } from "react";
import { toast } from "sonner";
import { getStudentDeadlines } from "../../api/student";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../ui/card";

const DeadlinesPanel = () => {
  const [deadlines, setDeadlines] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchDeadlines();
  }, []);

  const fetchDeadlines = async () => {
    try {
      setIsLoading(true);
      const response = await getStudentDeadlines();
      if (response.success) {
        setDeadlines(response.deadlines || []);
      } else {
        toast.error("Failed to fetch deadlines");
      }
    } catch (error) {
      console.error("Error fetching deadlines:", error);
      toast.error("Could not load deadlines");
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusBadge = (isPassed, daysRemaining) => {
    if (isPassed) {
      return <Badge variant="destructive">Passed</Badge>;
    } else if (daysRemaining <= 3) {
      return <Badge variant="warning">Urgent</Badge>;
    } else if (daysRemaining <= 7) {
      return <Badge variant="secondary">Upcoming</Badge>;
    } else {
      return <Badge variant="outline">Scheduled</Badge>;
    }
  };

  if (isLoading) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Deadlines</CardTitle>
          <CardDescription>
            Your upcoming deadlines and submissions
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-40">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full">
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Deadlines</CardTitle>
          <CardDescription>
            Your upcoming deadlines and submissions
          </CardDescription>
        </div>
        <Button variant="outline" size="sm" onClick={fetchDeadlines}>
          Refresh
        </Button>
      </CardHeader>
      <CardContent>
        {deadlines.length === 0 ? (
          <div className="text-center py-6 text-muted-foreground">
            No deadlines found for this academic session.
          </div>
        ) : (
          <div className="space-y-4">
            {deadlines.map((deadline) => (
              <div
                key={deadline._id}
                className="border rounded-lg p-4 flex justify-between items-center"
              >
                <div>
                  <h3 className="font-medium">{deadline.name}</h3>
                  <p className="text-muted-foreground text-sm">
                    {deadline.description}
                  </p>
                  <div className="flex items-center mt-2 gap-2">
                    <span className="text-sm">
                      {new Date(deadline.date).toLocaleDateString()}
                    </span>
                    {getStatusBadge(deadline.isPassed, deadline.daysRemaining)}
                  </div>
                </div>
                <div className="text-center">
                  <span className="block text-2xl font-bold">
                    {deadline.isPassed ? "0" : deadline.daysRemaining}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    days left
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default DeadlinesPanel;
