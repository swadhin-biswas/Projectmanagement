import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';
import { api } from '../../lib/api';
import { Button } from '../ui/button';
import { Card } from '../ui/card';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';

// Form validation schema
const inviteSchema = z.object({
  studentId: z.string()
    .min(3, 'Student ID must be at least 3 characters')
    .regex(/^STU\d{6}$/, 'Student ID must be in format STU followed by 6 digits'),
  message: z.string().max(200, 'Message must be less than 200 characters').optional(),
});

export const TeamInvite = ({ teamId, onInviteSent }) => {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting }
  } = useForm({
    resolver: zodResolver(inviteSchema),
    defaultValues: {
      studentId: '',
      message: ''
    }
  });

  const onSubmit = async (data) => {
    try {
      const response = await api.post(`/teams/${teamId}/invite`, data);

      if (response.data.success) {
        toast.success("Invitation sent successfully");
        reset();
        if (onInviteSent) {
          onInviteSent(response.data.data);
        }
      } else {
        toast.error(response.data.error || "Failed to send invitation");
      }
    } catch (error) {
      const message = error.response?.data?.error || "Failed to send invitation";
      toast.error(message);

      // Show specific error messages based on error type
      if (message.includes("already in a team")) {
        toast.error("This student is already in another team");
      } else if (message.includes("already invited")) {
        toast.error("You have already invited this student");
      } else if (message.includes("team is full")) {
        toast.error("Your team is already at maximum capacity");
      }
    }
  };

  return (
    <Card className="p-4">
      <h3 className="text-lg font-semibold mb-4">Invite Student</h3>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <Input
            {...register('studentId')}
            placeholder="Student ID (e.g., STU123456)"
            className={errors.studentId ? 'border-red-500' : ''}
          />
          {errors.studentId && (
            <p className="text-sm text-red-500 mt-1">
              {errors.studentId.message}
            </p>
          )}
        </div>

        <div>
          <Textarea
            {...register('message')}
            placeholder="Add a personal message (optional)"
            className={errors.message ? 'border-red-500' : ''}
            rows={3}
          />
          {errors.message && (
            <p className="text-sm text-red-500 mt-1">
              {errors.message.message}
            </p>
          )}
        </div>

        <Button
          type="submit"
          disabled={isSubmitting}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white"
        >
          {isSubmitting ? 'Sending...' : 'Send Invitation'}
        </Button>
      </form>
    </Card>
  );
};