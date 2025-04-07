import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { CalendarIcon, Clock, Repeat } from 'lucide-react';
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
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { format } from 'date-fns';
import { Calendar } from '@/components/ui/calendar';
import { useForm } from 'react-hook-form';
import { api } from '../../lib/api';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

const recurrenceOptions = [
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' }
];

export const RecurringEventDialog = ({ projectId, onEventCreated }) => {
  const [isOpen, setIsOpen] = useState(false);
  const form = useForm({
    defaultValues: {
      title: '',
      type: 'meeting',
      date: new Date(),
      time: '09:00',
      recurrence: 'weekly',
      link: '',
      description: ''
    }
  });

  const onSubmit = async (data) => {
    try {
      const eventDate = new Date(data.date);
      const [hours, minutes] = data.time.split(':');
      eventDate.setHours(parseInt(hours, 10), parseInt(minutes, 10));

      const response = await api.post(`/api/projects/${projectId}/calendar`, {
        title: data.title,
        type: data.type,
        date: eventDate.toISOString(),
        recurrence: data.recurrence,
        link: data.link,
        description: data.description,
        isAllDay: false
      });

      if (response.data.success) {
        toast.success('Recurring event created successfully');
        onEventCreated?.(response.data.event);
        setIsOpen(false);
        form.reset();
      }
    } catch (error) {
      toast.error('Failed to create recurring event');
      console.error('Failed to create recurring event:', error);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <Repeat className="w-4 h-4 mr-2" />
          Add Recurring Event
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Schedule Recurring Event</DialogTitle>
          <DialogDescription>
            Create a repeating event for regular team meetings
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="title"
              rules={{ required: 'Title is required' }}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Meeting Title</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Weekly Team Sync" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="date"
                rules={{ required: 'Start date is required' }}
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Start Date</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            className={cn(
                              'pl-3 text-left font-normal',
                              !field.value && 'text-muted-foreground'
                            )}
                          >
                            {field.value ? (
                              format(field.value, 'PPP')
                            ) : (
                              <span>Pick a date</span>
                            )}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={field.onChange}
                          disabled={(date) =>
                            date < new Date()
                          }
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="time"
                rules={{ required: 'Start time is required' }}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Time</FormLabel>
                    <FormControl>
                      <div className="flex items-center">
                        <Input
                          {...field}
                          type="time"
                          className="w-full"
                        />
                        <Clock className="w-4 h-4 ml-2 text-muted-foreground" />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="recurrence"
              rules={{ required: 'Recurrence is required' }}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Repeats</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select frequency" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {recurrenceOptions.map(option => (
                        <SelectItem
                          key={option.value}
                          value={option.value}
                        >
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="link"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Meeting Link (Optional)</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      placeholder="https://meet.google.com/..."
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="submit">Create Recurring Event</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};