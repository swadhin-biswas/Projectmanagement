import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { XCircle } from "lucide-react";
import { api } from "../../lib/api";
import { Button } from "../ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "../ui/dialog";
import { Textarea } from "../ui/textarea";
import { Label } from "../ui/label";
import { Checkbox } from "../ui/checkbox";
import { RadioGroup, RadioGroupItem } from "../ui/radio-group";

const REJECTION_REASONS = [
  {
    id: "qualifications",
    label: "Insufficient qualifications",
    description: "The applicant does not meet the minimum qualification requirements.",
  },
  {
    id: "experience",
    label: "Lack of relevant experience",
    description: "The applicant lacks necessary experience in the field.",
  },
  {
    id: "workload",
    label: "Current workload constraints",
    description: "The department has reached its supervisor capacity for this term.",
  },
  {
    id: "expertise",
    label: "Expertise mismatch",
    description: "The applicant's expertise does not align with current project needs.",
  },
  {
    id: "background_check",
    label: "Background check issues",
    description: "Issues were identified during the background verification process.",
  },
  {
    id: "documentation",
    label: "Incomplete documentation",
    description: "Required documents were missing or incomplete.",
  },
  {
    id: "other",
    label: "Other reason",
    description: "Specify a custom reason for rejection.",
  },
];

const SupervisorRejectionForm = ({
  isOpen,
  onClose,
  supervisor = {},
  afterReject = () => {}
}) => {
  const [selectedReason, setSelectedReason] = useState("");
  const [customReason, setCustomReason] = useState("");
  const [sendEmail, setSendEmail] = useState(true);
  const [loading, setLoading] = useState(false);

  const queryClient = useQueryClient();

  // Handle form submission
  const rejectMutation = useMutation({
    mutationFn: async (data) => {
      const response = await api.post(`/api/admin/supervisors/${supervisor._id}/reject`, data);
      return response.data;
    },
    onSuccess: (data) => {
      toast.success("Supervisor application rejected successfully");
      queryClient.invalidateQueries({ queryKey: ["supervisor-applications"] });
      afterReject();
      onClose();
    },
    onError: (error) => {
      console.error("Error rejecting supervisor application:", error);
      toast.error(error.response?.data?.message || "Failed to reject supervisor application");
      setLoading(false);
    }
  });

  const handleReject = () => {
    if (!selectedReason) {
      toast.error("Please select a reason for rejection");
      return;
    }

    if (selectedReason === "other" && !customReason.trim()) {
      toast.error("Please provide a custom reason for rejection");
      return;
    }

    setLoading(true);

    const finalReason = selectedReason === "other"
      ? customReason
      : REJECTION_REASONS.find(r => r.id === selectedReason)?.label;

    const data = {
      reason: finalReason,
      details: selectedReason === "other"
        ? ""
        : REJECTION_REASONS.find(r => r.id === selectedReason)?.description,
      sendEmail,
    };

    rejectMutation.mutate(data);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center text-destructive">
            <XCircle className="mr-2 h-5 w-5" />
            Reject Supervisor Application
          </DialogTitle>
          <DialogDescription>
            {supervisor.fullName ? (
              <>Rejecting application for <span className="font-medium">{supervisor.fullName}</span></>
            ) : (
              "Provide a reason for rejecting this supervisor application"
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <div className="space-y-4">
            <Label className="text-base">Reason for rejection</Label>
            <RadioGroup value={selectedReason} onValueChange={setSelectedReason}>
              {REJECTION_REASONS.map((reason) => (
                <div key={reason.id} className="flex items-start space-x-2 space-y-0 py-2">
                  <RadioGroupItem value={reason.id} id={reason.id} />
                  <div className="grid gap-1.5 leading-none">
                    <Label
                      htmlFor={reason.id}
                      className="font-medium text-base"
                    >
                      {reason.label}
                    </Label>
                    <p className="text-sm text-gray-500">
                      {reason.description}
                    </p>
                  </div>
                </div>
              ))}
            </RadioGroup>
          </div>

          {selectedReason === "other" && (
            <div className="space-y-4">
              <Label htmlFor="custom-reason">
                Provide a custom reason
              </Label>
              <Textarea
                id="custom-reason"
                placeholder="Enter a detailed reason for rejection..."
                value={customReason}
                onChange={(e) => setCustomReason(e.target.value)}
                className="min-h-[100px]"
              />
            </div>
          )}

          <div className="flex items-center space-x-2">
            <Checkbox
              id="send-email"
              checked={sendEmail}
              onCheckedChange={(checked) => setSendEmail(checked)}
            />
            <Label
              htmlFor="send-email"
              className="text-sm font-normal cursor-pointer"
            >
              Send email notification to applicant
            </Label>
          </div>
        </div>

        <DialogFooter className="flex space-x-2 sm:space-x-0">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={handleReject}
            disabled={loading}
          >
            {loading ? "Rejecting..." : "Reject Application"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default SupervisorRejectionForm;