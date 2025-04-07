import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import {
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { DragDropContext, Draggable, Droppable } from '@hello-pangea/dnd';
import { format } from 'date-fns';
import { CalendarIcon, Plus } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { useWebSocket } from '../../contexts/WebSocketContext';
import { useMilestoneCollaboration } from '../../services/milestoneService';

export const MilestoneBoard = ({ projectId, teamMembers, isLeader }) => {
  const [milestones, setMilestones] = useState([]);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [newMilestone, setNewMilestone] = useState({
    title: '',
    description: '',
    assignedTo: []
  });

  const { socket } = useWebSocket();
  const {
    createMilestone,
    updateMilestone,
    deleteMilestone,
    markComplete
  } = useMilestoneCollaboration(projectId);

  useEffect(() => {
    if (socket) {
      socket.emit('join', `project:${projectId}`);

      socket.on('milestone:created', ({ milestone }) => {
        setMilestones(prev => [...prev, milestone]);
      });

      socket.on('milestone:updated', ({ milestoneId, ...updates }) => {
        setMilestones(prev =>
          prev.map(m =>
            m._id === milestoneId ? { ...m, ...updates } : m
          )
        );
      });

      socket.on('milestone:deleted', ({ milestoneId }) => {
        setMilestones(prev => prev.filter(m => m._id !== milestoneId));
      });

      socket.on('milestone:completed', ({ milestoneId }) => {
        setMilestones(prev =>
          prev.map(m =>
            m._id === milestoneId
              ? { ...m, status: 'completed', completedAt: new Date() }
              : m
          )
        );
      });

      return () => {
        socket.emit('leave', `project:${projectId}`);
        socket.off('milestone:created');
        socket.off('milestone:updated');
        socket.off('milestone:deleted');
        socket.off('milestone:completed');
      };
    }
  }, [socket, projectId]);

  const handleCreateMilestone = async (e) => {
    e.preventDefault();
    try {
      await createMilestone({
        ...newMilestone,
        dueDate: selectedDate.toISOString()
      });
      setIsCreateOpen(false);
      setNewMilestone({ title: '', description: '', assignedTo: [] });
      toast.success('Milestone created successfully');
    } catch (error) {
      toast.error('Failed to create milestone');
    }
  };

  const handleComplete = async (milestoneId) => {
    try {
      await markComplete(milestoneId);
      toast.success('Milestone marked as complete');
    } catch (error) {
      toast.error('Failed to complete milestone');
    }
  };

  const handleDelete = async (milestoneId) => {
    try {
      await deleteMilestone(milestoneId);
      toast.success('Milestone deleted successfully');
    } catch (error) {
      toast.error('Failed to delete milestone');
    }
  };

  const handleDragEnd = async (result) => {
    if (!result.destination) return;

    const { source, destination, draggableId } = result;

    // Don't do anything if dropped in same place
    if (
      source.droppableId === destination.droppableId &&
      source.index === destination.index
    ) {
      return;
    }

    // Find the milestone that was dragged
    const milestone = milestones.find(m => m._id === draggableId);
    if (!milestone) return;

    // Update milestone status based on destination column
    const newStatus = destination.droppableId;
    try {
      await updateMilestone(milestone._id, { status: newStatus });

      // Optimistically update UI
      setMilestones(prev =>
        prev.map(m =>
          m._id === milestone._id
            ? { ...m, status: newStatus }
            : m
        )
      );
    } catch (error) {
      toast.error('Failed to update milestone status');
    }
  };

  const milestonesByStatus = {
    pending: milestones.filter(m => m.status === 'pending'),
    in_progress: milestones.filter(m => m.status === 'in_progress'),
    completed: milestones.filter(m => m.status === 'completed')
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Project Milestones</h2>
        {isLeader && (
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                New Milestone
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Milestone</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleCreateMilestone} className="space-y-4">
                <div>
                  <Label htmlFor="title">Title</Label>
                  <Input
                    id="title"
                    value={newMilestone.title}
                    onChange={e => setNewMilestone(prev => ({
                      ...prev,
                      title: e.target.value
                    }))}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={newMilestone.description}
                    onChange={e => setNewMilestone(prev => ({
                      ...prev,
                      description: e.target.value
                    }))}
                    required
                  />
                </div>
                <div>
                  <Label>Due Date</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          'w-full justify-start text-left font-normal',
                          !selectedDate && 'text-muted-foreground'
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {selectedDate ? format(selectedDate, 'PPP') : 'Pick a date'}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={selectedDate}
                        onSelect={setSelectedDate}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>
                <DialogFooter>
                  <Button type="submit">Create Milestone</Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <DragDropContext onDragEnd={handleDragEnd}>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {Object.entries(milestonesByStatus).map(([status, items]) => (
            <Droppable droppableId={status} key={status}>
              {(provided, snapshot) => (
                <div
                  ref={provided.innerRef}
                  {...provided.droppableProps}
                  className={cn(
                    "bg-background/50 p-4 rounded-lg border border-border min-h-[200px]",
                    snapshot.isDraggingOver && "bg-accent/50"
                  )}
                >
                  <h3 className="font-semibold mb-4 capitalize">
                    {status.replace('_', ' ')}
                  </h3>
                  <div className="space-y-4">
                    {items.map((milestone, index) => (
                      <Draggable
                        key={milestone._id}
                        draggableId={milestone._id}
                        index={index}
                      >
                        {(provided, snapshot) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            {...provided.dragHandleProps}
                            className={cn(
                              "bg-card p-4 rounded-lg border border-border",
                              snapshot.isDragging && "shadow-lg"
                            )}
                          >
                            <div className="flex justify-between items-start mb-2">
                              <h4 className="font-medium">{milestone.title}</h4>
                              {isLeader && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleDelete(milestone._id)}
                                >
                                  ×
                                </Button>
                              )}
                            </div>
                            <p className="text-sm text-muted-foreground mb-3">
                              {milestone.description}
                            </p>
                            <div className="flex items-center justify-between text-xs text-muted-foreground">
                              <span>
                                Due: {format(new Date(milestone.dueDate), 'PP')}
                              </span>
                              {milestone.status !== 'completed' && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleComplete(milestone._id)}
                                >
                                  Mark Complete
                                </Button>
                              )}
                            </div>
                            {milestone.assignedTo?.length > 0 && (
                              <div className="mt-3 flex -space-x-2">
                                {milestone.assignedTo.map(member => (
                                  <Avatar
                                    key={member._id}
                                    className="border-2 border-background w-8 h-8"
                                  >
                                    <AvatarImage
                                      src={member.profilePicture}
                                      alt={member.fullName}
                                    />
                                    <AvatarFallback>
                                      {member.fullName.charAt(0)}
                                    </AvatarFallback>
                                  </Avatar>
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                  </div>
                </div>
              )}
            </Droppable>
          ))}
        </div>
      </DragDropContext>
    </div>
  );
};