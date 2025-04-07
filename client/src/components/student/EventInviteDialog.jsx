import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import {
    Form,
    FormField,
    FormItem,
    FormLabel,
    FormMessage
} from '@/components/ui/form';
import { ScrollArea } from '@/components/ui/scroll-area';
import { UserPlus } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { api } from '../../lib/api';

export const EventInviteDialog = ({ event, projectId, onInvitationsSent }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [teamMembers, setTeamMembers] = useState([]);
  const [loading, setLoading] = useState(false);

  const form = useForm({
    defaultValues: {
      members: []
    }
  });

  useEffect(() => {
    const fetchTeamMembers = async () => {
      try {
        const response = await api.get(`/api/projects/${projectId}/team/members`);
        const members = response.data.members.filter(
          member => !event.attendees?.some(a => a.user === member._id)
        );
        setTeamMembers(members);
      } catch (error) {
        console.error('Failed to fetch team members:', error);
        toast.error('Failed to load team members');
      }
    };

    if (isOpen) {
      fetchTeamMembers();
    }
  }, [isOpen, projectId, event.attendees]);

  const onSubmit = async (data) => {
    try {
      setLoading(true);

      const response = await api.post(`/api/projects/${projectId}/calendar/${event._id}/invite`, {
        members: data.members
      });

      if (response.data.success) {
        toast.success('Invitations sent successfully');
        onInvitationsSent?.(response.data.attendees);
        setIsOpen(false);
        form.reset();
      }
    } catch (error) {
      console.error('Failed to send invitations:', error);
      toast.error('Failed to send invitations');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <UserPlus className="h-4 w-4 mr-2" />
          Invite
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Invite Team Members</DialogTitle>
          <DialogDescription>
            Select team members to invite to "{event.title}"
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="members"
              render={({ field }) => (
                <FormItem>
                  <div className="mb-4">
                    <FormLabel>Team Members</FormLabel>
                  </div>
                  <ScrollArea className="h-[200px] rounded-md border p-4">
                    {teamMembers.map((member) => (
                      <div
                        key={member._id}
                        className="flex items-center space-x-2 mb-2"
                      >
                        <Checkbox
                          checked={field.value?.includes(member._id)}
                          onCheckedChange={(checked) => {
                            const updatedValue = checked
                              ? [...(field.value || []), member._id]
                              : field.value?.filter((id) => id !== member._id);
                            field.onChange(updatedValue);
                          }}
                        />
                        <div className="flex flex-col">
                          <span className="text-sm font-medium">
                            {member.fullName}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {member.email}
                          </span>
                        </div>
                      </div>
                    ))}
                    {teamMembers.length === 0 && (
                      <div className="text-sm text-muted-foreground text-center py-4">
                        No team members available to invite
                      </div>
                    )}
                  </ScrollArea>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button
                type="submit"
                disabled={loading || teamMembers.length === 0}
              >
                Send Invitations
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};