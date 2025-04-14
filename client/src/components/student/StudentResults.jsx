import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { ArrowLeft, ChevronRight, File } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { studentAPI } from "../../api/student";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Skeleton } from "../ui/skeleton";

export const StudentResults = () => {
  const [selectedResult, setSelectedResult] = useState(null);

  const { data: results, isLoading } = useQuery({
    queryKey: ["student-results"],
    queryFn: async () => {
      try {
        return await studentAPI.getStudentResults();
      } catch (error) {
        toast.error("Failed to load results");
        throw error;
      }
    },
  });

  const { data: resultDetail, isLoading: isLoadingDetail } = useQuery({
    queryKey: ["result-detail", selectedResult],
    queryFn: async () => {
      if (!selectedResult) return null;
      try {
        return await studentAPI.getResultDetail(selectedResult);
      } catch (error) {
        toast.error("Failed to load result details");
        throw error;
      }
    },
    enabled: !!selectedResult,
  });

  const getScoreColor = (score) => {
    if (score >= 80) return "bg-green-500";
    if (score >= 65) return "bg-blue-500";
    if (score >= 50) return "bg-yellow-500";
    return "bg-red-500";
  };

  const formatDate = (date) => {
    if (!date) return "N/A";
    return format(new Date(date), "PPP");
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  if (selectedResult && resultDetail) {
    return (
      <div className="space-y-4">
        <Button
          variant="ghost"
          onClick={() => setSelectedResult(null)}
          className="mb-4"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Results
        </Button>

        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle>Result Details</CardTitle>
              <Badge className={getScoreColor(resultDetail.score)}>
                {resultDetail.score}%
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h3 className="font-semibold mb-1">Category</h3>
              <p className="text-gray-600">{resultDetail.category}</p>
            </div>

            {resultDetail.project && (
              <div>
                <h3 className="font-semibold mb-1">Project</h3>
                <p className="text-gray-600">{resultDetail.project.name}</p>
                <p className="text-sm text-gray-500">
                  Type: {resultDetail.project.type}
                </p>
                <p className="text-sm text-gray-500">
                  Submitted: {formatDate(resultDetail.project.submissionDate)}
                </p>
              </div>
            )}

            {resultDetail.supervisor && (
              <div>
                <h3 className="font-semibold mb-1">Supervisor</h3>
                <p className="text-gray-600">{resultDetail.supervisor.name}</p>
              </div>
            )}

            {resultDetail.feedback && (
              <div>
                <h3 className="font-semibold mb-1">Feedback</h3>
                <p className="text-gray-600 whitespace-pre-line">
                  {resultDetail.feedback}
                </p>
              </div>
            )}

            <div>
              <h3 className="font-semibold mb-1">Marked On</h3>
              <p className="text-gray-600">{formatDate(resultDetail.date)}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold mb-4">Results</h2>

      {!results || results.length === 0 ? (
        <Card>
          <CardContent className="p-6">
            <div className="text-center">
              <File className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">
                No Results
              </h3>
              <p className="mt-1 text-sm text-gray-500">
                No results have been published yet.
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {results.map((result) => (
            <Card
              key={result.id}
              className="cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => setSelectedResult(result.id)}
            >
              <CardContent className="p-4">
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="font-semibold">{result.category}</h3>
                    {result.project && (
                      <p className="text-sm text-gray-500">
                        {result.project.name}
                      </p>
                    )}
                    <p className="text-xs text-gray-400">
                      {formatDate(result.date)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className={getScoreColor(result.score)}>
                      {result.score}%
                    </Badge>
                    <ChevronRight className="h-4 w-4 text-gray-400" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};
