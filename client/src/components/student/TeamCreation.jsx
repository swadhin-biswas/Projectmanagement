import { zodResolver } from '@hookform/resolvers/zod';
import { Users } from 'lucide-react';
import React from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';
import { api } from '../../lib/api';
import { Button } from '../ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '../ui/form';
import { Input } from '../ui/input';

const teamSchema = z.object({
  name: z.string()
    .min(3, 'Team name must be at least 3 characters')
    .max(50, 'Team name must be less than 50 characters')
    .regex(/^[a-zA-Z0-9\s-]+$/, 'Team name can only contain letters, numbers, spaces and hyphens'),
});

const TeamCreation = ({ onTeamCreated }) => {
  const form = useForm({
    resolver: zodResolver(teamSchema),
    defaultValues: {
      name: ''
    }
  });

  const onSubmit = async (data) => {
    try {
      const response = await api.post('/api/student/create-team', data);
      toast.success('Team created successfully');
      if (onTeamCreated) {
        onTeamCreated(response.data);
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to create team');
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5 text-blue-500" />
          Create New Team
        </CardTitle>
        <CardDescription>
          Create a new team and become the team leader. You'll be able to invite other students to join your team.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Team Name</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Enter a unique team name..."
                      {...field}
                      className="bg-white dark:bg-gray-800"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button
              type="submit"
              className="w-full bg-blue-600 hover:bg-blue-700"
              disabled={form.formState.isSubmitting}
            >
              {form.formState.isSubmitting ? 'Creating...' : 'Create Team'}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
};

export default TeamCreation;