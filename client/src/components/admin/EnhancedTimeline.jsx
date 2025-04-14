import React, { useState, useEffect } from 'react';
import {
  Box, VStack, HStack, Heading, Text, Button, IconButton,
  useToast, Flex, Divider, Badge, Tooltip, Input, FormControl,
  FormLabel, Modal, ModalOverlay, ModalContent, ModalHeader,
  ModalBody, ModalFooter, ModalCloseButton, useDisclosure,
  Drawer, DrawerBody, DrawerHeader, DrawerOverlay, DrawerContent,
  DrawerCloseButton, Slider, SliderTrack, SliderFilledTrack, SliderThumb,
  Popover, PopoverTrigger, PopoverContent, PopoverHeader, PopoverBody,
  PopoverArrow, PopoverCloseButton, Spinner
} from '@chakra-ui/react';
import {
  AddIcon, EditIcon, DeleteIcon, InfoIcon, CalendarIcon,
  TimeIcon, ChevronRightIcon, WarningIcon, CheckCircleIcon
} from '@chakra-ui/icons';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { getSessionTimeline, updateSessionTimeline, createMilestone, deleteMilestone } from '../../api/admin';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';

const EnhancedTimeline = ({ sessionId }) => {
  const [timeline, setTimeline] = useState([]);
  const [sessionData, setSessionData] = useState(null);
  const [selectedMilestone, setSelectedMilestone] = useState(null);
  const { isOpen, onOpen, onClose } = useDisclosure();
  const { isOpen: isDrawerOpen, onOpen: onDrawerOpen, onClose: onDrawerClose } = useDisclosure();
  const toast = useToast();
  const queryClient = useQueryClient();

  // Form state for adding/editing milestones
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    dueDate: new Date(),
    notifyDaysBefore: 7,
    notifyStudents: true,
    notifySupervisors: true,
    importance: 'medium',
    category: 'submission'
  });

  // Query to fetch timeline data
  const { data, isLoading, error } = useQuery(
    ['sessionTimeline', sessionId],
    () => getSessionTimeline(sessionId),
    {
      onSuccess: (data) => {
        setTimeline(data.milestones || []);
        setSessionData({
          startDate: new Date(data.startDate),
          endDate: new Date(data.endDate),
          name: data.name
        });
      },
      enabled: !!sessionId
    }
  );

  // Mutation to update timeline
  const updateMutation = useMutation(
    (timelineData) => updateSessionTimeline(sessionId, timelineData),
    {
      onSuccess: () => {
        toast({
          title: 'Timeline updated',
          status: 'success',
          duration: 3000,
          isClosable: true,
        });
        queryClient.invalidateQueries(['sessionTimeline', sessionId]);
      },
      onError: (err) => {
        toast({
          title: 'Failed to update timeline',
          description: err.message || 'An error occurred',
          status: 'error',
          duration: 3000,
          isClosable: true,
        });
      }
    }
  );

  // Mutation to create milestone
  const createMutation = useMutation(
    (milestoneData) => createMilestone(sessionId, milestoneData),
    {
      onSuccess: () => {
        toast({
          title: 'Milestone added',
          status: 'success',
          duration: 3000,
          isClosable: true,
        });
        onClose();
        queryClient.invalidateQueries(['sessionTimeline', sessionId]);
      },
      onError: (err) => {
        toast({
          title: 'Failed to add milestone',
          description: err.message || 'An error occurred',
          status: 'error',
          duration: 3000,
          isClosable: true,
        });
      }
    }
  );

  // Mutation to delete milestone
  const deleteMutation = useMutation(
    (milestoneId) => deleteMilestone(sessionId, milestoneId),
    {
      onSuccess: () => {
        toast({
          title: 'Milestone deleted',
          status: 'success',
          duration: 3000,
          isClosable: true,
        });
        queryClient.invalidateQueries(['sessionTimeline', sessionId]);
      },
      onError: (err) => {
        toast({
          title: 'Failed to delete milestone',
          description: err.message || 'An error occurred',
          status: 'error',
          duration: 3000,
          isClosable: true,
        });
      }
    }
  );

  // Handle drag end for reordering
  const handleDragEnd = (result) => {
    if (!result.destination) return;

    const items = Array.from(timeline);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    // Update the order property for each item
    const updatedItems = items.map((item, index) => ({
      ...item,
      order: index + 1
    }));

    setTimeline(updatedItems);

    // Persist the changes
    updateMutation.mutate({ milestones: updatedItems });
  };

  // Open the milestone modal for editing or creating
  const openMilestoneModal = (milestone = null) => {
    if (milestone) {
      setSelectedMilestone(milestone);
      setFormData({
        title: milestone.title,
        description: milestone.description,
        dueDate: new Date(milestone.dueDate),
        notifyDaysBefore: milestone.notifyDaysBefore,
        notifyStudents: milestone.notifyStudents,
        notifySupervisors: milestone.notifySupervisors,
        importance: milestone.importance,
        category: milestone.category
      });
    } else {
      setSelectedMilestone(null);
      setFormData({
        title: '',
        description: '',
        dueDate: new Date(),
        notifyDaysBefore: 7,
        notifyStudents: true,
        notifySupervisors: true,
        importance: 'medium',
        category: 'submission'
      });
    }
    onOpen();
  };

  // Open timeline drawer for adjusting multiple milestones
  const openTimelineDrawer = () => {
    onDrawerOpen();
  };

  // Handle form input changes
  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData({
      ...formData,
      [name]: type === 'checkbox' ? checked : value
    });
  };

  // Handle date change
  const handleDateChange = (date) => {
    setFormData({
      ...formData,
      dueDate: date
    });
  };

  // Submit form to create or update milestone
  const handleSubmitMilestone = () => {
    const milestoneData = {
      ...formData,
      dueDate: formData.dueDate.toISOString()
    };

    if (selectedMilestone) {
      // Update existing milestone
      updateMutation.mutate({
        milestones: timeline.map(m =>
          m._id === selectedMilestone._id
            ? { ...m, ...milestoneData, _id: m._id }
            : m
        )
      });
    } else {
      // Create new milestone
      createMutation.mutate(milestoneData);
    }

    onClose();
  };

  // Delete a milestone
  const handleDeleteMilestone = (milestoneId) => {
    if (window.confirm('Are you sure you want to delete this milestone?')) {
      deleteMutation.mutate(milestoneId);
    }
  };

  // Calculate the position on the timeline based on date
  const calculatePosition = (date) => {
    if (!sessionData) return 0;

    const totalDuration = sessionData.endDate - sessionData.startDate;
    const elapsedDuration = new Date(date) - sessionData.startDate;

    return Math.max(0, Math.min(100, (elapsedDuration / totalDuration) * 100));
  };

  // Get color based on importance
  const getImportanceColor = (importance) => {
    switch (importance) {
      case 'high': return 'red';
      case 'medium': return 'orange';
      case 'low': return 'green';
      default: return 'blue';
    }
  };

  // Get icon based on category
  const getCategoryIcon = (category) => {
    switch (category) {
      case 'submission': return <TimeIcon />;
      case 'meeting': return <CalendarIcon />;
      case 'evaluation': return <CheckCircleIcon />;
      default: return <InfoIcon />;
    }
  };

  // Check if milestone date is in the past
  const isPastDue = (date) => {
    return new Date(date) < new Date();
  };

  if (isLoading) {
    return (
      <Flex justify="center" align="center" h="300px">
        <Spinner size="xl" />
      </Flex>
    );
  }

  if (error) {
    return (
      <Box p={4} bg="red.50" borderRadius="md">
        <Heading size="md" color="red.500">Error Loading Timeline</Heading>
        <Text>{error.message || 'An error occurred while loading the timeline data'}</Text>
      </Box>
    );
  }

  return (
    <Box p={4}>
      <Flex justify="space-between" align="center" mb={6}>
        <Heading size="lg">Timeline Management</Heading>
        <HStack>
          <Button
            leftIcon={<EditIcon />}
            colorScheme="blue"
            variant="outline"
            onClick={openTimelineDrawer}
          >
            Adjust Timeline
          </Button>
          <Button
            leftIcon={<AddIcon />}
            colorScheme="blue"
            onClick={() => openMilestoneModal()}
          >
            Add Milestone
          </Button>
        </HStack>
      </Flex>

      {/* Session info */}
      {sessionData && (
        <Box mb={6} p={4} borderWidth="1px" borderRadius="md" bg="blue.50">
          <Heading size="md" mb={2}>{sessionData.name}</Heading>
          <HStack>
            <Text><strong>Start:</strong> {sessionData.startDate.toLocaleDateString()}</Text>
            <Text><strong>End:</strong> {sessionData.endDate.toLocaleDateString()}</Text>
            <Text>
              <strong>Duration:</strong> {Math.ceil((sessionData.endDate - sessionData.startDate) / (1000 * 60 * 60 * 24))} days
            </Text>
          </HStack>
        </Box>
      )}

      {/* Timeline visualization */}
      <Box
        position="relative"
        h="100px"
        bg="gray.100"
        borderRadius="md"
        mb={6}
        overflow="hidden"
      >
        {/* Timeline line */}
        <Box
          position="absolute"
          top="50%"
          left="0"
          right="0"
          h="4px"
          bg="gray.300"
          transform="translateY(-50%)"
        />

        {/* Current date marker */}
        <Box
          position="absolute"
          top="0"
          bottom="0"
          left={`${calculatePosition(new Date())}%`}
          w="2px"
          bg="red.500"
          zIndex="2"
        >
          <Box
            position="absolute"
            top="-20px"
            left="50%"
            transform="translateX(-50%)"
            bg="red.500"
            color="white"
            fontSize="xs"
            p={1}
            borderRadius="md"
          >
            Today
          </Box>
        </Box>

        {/* Milestone markers */}
        {timeline.map((milestone) => (
          <Tooltip
            key={milestone._id}
            label={`${milestone.title} - ${new Date(milestone.dueDate).toLocaleDateString()}`}
          >
            <Box
              position="absolute"
              top="50%"
              left={`${calculatePosition(milestone.dueDate)}%`}
              transform="translate(-50%, -50%)"
              w="12px"
              h="12px"
              borderRadius="full"
              bg={getImportanceColor(milestone.importance)}
              cursor="pointer"
              onClick={() => openMilestoneModal(milestone)}
              _hover={{ boxShadow: 'md', transform: 'translate(-50%, -50%) scale(1.2)' }}
              transition="all 0.2s"
            />
          </Tooltip>
        ))}

        {/* Start date marker */}
        {sessionData && (
          <Box
            position="absolute"
            top="50%"
            left="0%"
            transform="translateY(-50%)"
            borderRadius="full"
            fontSize="xs"
            fontWeight="bold"
            color="gray.600"
          >
            Start
          </Box>
        )}

        {/* End date marker */}
        {sessionData && (
          <Box
            position="absolute"
            top="50%"
            right="0%"
            transform="translateY(-50%)"
            borderRadius="full"
            fontSize="xs"
            fontWeight="bold"
            color="gray.600"
          >
            End
          </Box>
        )}
      </Box>

      {/* Milestones list with drag and drop */}
      <Box>
        <Heading size="md" mb={4}>Milestones</Heading>

        <DragDropContext onDragEnd={handleDragEnd}>
          <Droppable droppableId="milestones">
            {(provided) => (
              <VStack
                {...provided.droppableProps}
                ref={provided.innerRef}
                spacing={4}
                align="stretch"
              >
                {timeline.length > 0 ? (
                  timeline
                    .sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate))
                    .map((milestone, index) => (
                      <Draggable
                        key={milestone._id}
                        draggableId={milestone._id}
                        index={index}
                      >
                        {(provided) => (
                          <Box
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            {...provided.dragHandleProps}
                            p={4}
                            borderWidth="1px"
                            borderRadius="md"
                            borderLeftWidth="4px"
                            borderLeftColor={getImportanceColor(milestone.importance)}
                            bg={isPastDue(milestone.dueDate) ? 'gray.50' : 'white'}
                            position="relative"
                          >
                            <Flex justify="space-between" align="center">
                              <HStack>
                                {getCategoryIcon(milestone.category)}
                                <Heading size="sm">{milestone.title}</Heading>
                                <Badge
                                  colorScheme={getImportanceColor(milestone.importance)}
                                >
                                  {milestone.importance}
                                </Badge>
                              </HStack>
                              <HStack>
                                <IconButton
                                  size="sm"
                                  icon={<EditIcon />}
                                  aria-label="Edit milestone"
                                  onClick={() => openMilestoneModal(milestone)}
                                />
                                <IconButton
                                  size="sm"
                                  icon={<DeleteIcon />}
                                  aria-label="Delete milestone"
                                  colorScheme="red"
                                  variant="ghost"
                                  onClick={() => handleDeleteMilestone(milestone._id)}
                                />
                              </HStack>
                            </Flex>

                            <Text fontSize="sm" mt={2}>
                              {milestone.description}
                            </Text>

                            <HStack mt={3} fontSize="sm" color="gray.600">
                              <Text fontWeight="medium">
                                Due: {new Date(milestone.dueDate).toLocaleDateString()}
                              </Text>
                              {isPastDue(milestone.dueDate) && (
                                <Badge colorScheme="red">Past due</Badge>
                              )}
                              {milestone.notifyDaysBefore > 0 && (
                                <Text>
                                  Notifies {milestone.notifyDaysBefore} days before
                                </Text>
                              )}
                            </HStack>
                          </Box>
                        )}
                      </Draggable>
                    ))
                ) : (
                  <Box p={4} textAlign="center" borderWidth="1px" borderRadius="md">
                    <Text color="gray.500">No milestones have been created yet.</Text>
                  </Box>
                )}
                {provided.placeholder}
              </VStack>
            )}
          </Droppable>
        </DragDropContext>
      </Box>

      {/* Add/Edit Milestone Modal */}
      <Modal isOpen={isOpen} onClose={onClose} size="lg">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>
            {selectedMilestone ? 'Edit Milestone' : 'Add New Milestone'}
          </ModalHeader>
          <ModalCloseButton />

          <ModalBody>
            <VStack spacing={4} align="stretch">
              <FormControl isRequired>
                <FormLabel>Title</FormLabel>
                <Input
                  name="title"
                  value={formData.title}
                  onChange={handleInputChange}
                  placeholder="Milestone title"
                />
              </FormControl>

              <FormControl>
                <FormLabel>Description</FormLabel>
                <Input
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  placeholder="Brief description of this milestone"
                />
              </FormControl>

              <FormControl isRequired>
                <FormLabel>Due Date</FormLabel>
                <DatePicker
                  selected={formData.dueDate}
                  onChange={handleDateChange}
                  showTimeSelect
                  dateFormat="MMMM d, yyyy h:mm aa"
                  className="chakra-input css-1kp110w"
                  minDate={sessionData?.startDate}
                  maxDate={sessionData?.endDate}
                />
              </FormControl>

              <HStack>
                <FormControl>
                  <FormLabel>Category</FormLabel>
                  <select
                    name="category"
                    value={formData.category}
                    onChange={handleInputChange}
                    className="chakra-input css-1kp110w"
                  >
                    <option value="submission">Submission</option>
                    <option value="meeting">Meeting</option>
                    <option value="evaluation">Evaluation</option>
                    <option value="other">Other</option>
                  </select>
                </FormControl>

                <FormControl>
                  <FormLabel>Importance</FormLabel>
                  <select
                    name="importance"
                    value={formData.importance}
                    onChange={handleInputChange}
                    className="chakra-input css-1kp110w"
                  >
                    <option value="high">High</option>
                    <option value="medium">Medium</option>
                    <option value="low">Low</option>
                  </select>
                </FormControl>
              </HStack>

              <FormControl>
                <FormLabel>Notify Days Before</FormLabel>
                <Input
                  name="notifyDaysBefore"
                  type="number"
                  value={formData.notifyDaysBefore}
                  onChange={handleInputChange}
                  min={0}
                  max={30}
                />
              </FormControl>

              <HStack>
                <FormControl display="flex" alignItems="center">
                  <input
                    type="checkbox"
                    id="notifyStudents"
                    name="notifyStudents"
                    checked={formData.notifyStudents}
                    onChange={handleInputChange}
                    style={{ marginRight: '8px' }}
                  />
                  <FormLabel htmlFor="notifyStudents" mb={0}>
                    Notify Students
                  </FormLabel>
                </FormControl>

                <FormControl display="flex" alignItems="center">
                  <input
                    type="checkbox"
                    id="notifySupervisors"
                    name="notifySupervisors"
                    checked={formData.notifySupervisors}
                    onChange={handleInputChange}
                    style={{ marginRight: '8px' }}
                  />
                  <FormLabel htmlFor="notifySupervisors" mb={0}>
                    Notify Supervisors
                  </FormLabel>
                </FormControl>
              </HStack>
            </VStack>
          </ModalBody>

          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={onClose}>
              Cancel
            </Button>
            <Button
              colorScheme="blue"
              onClick={handleSubmitMilestone}
              isLoading={createMutation.isLoading || updateMutation.isLoading}
            >
              {selectedMilestone ? 'Update' : 'Create'}
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Timeline Adjustment Drawer */}
      <Drawer
        isOpen={isDrawerOpen}
        placement="right"
        onClose={onDrawerClose}
        size="md"
      >
        <DrawerOverlay />
        <DrawerContent>
          <DrawerCloseButton />
          <DrawerHeader>Adjust Timeline</DrawerHeader>

          <DrawerBody>
            <VStack spacing={6} align="stretch">
              <Text>
                Adjust multiple milestones at once by shifting dates forward or backward.
                This is useful for handling delays or changes in the session schedule.
              </Text>

              <Box p={4} borderWidth="1px" borderRadius="md">
                <Heading size="sm" mb={4}>Shift All Milestones</Heading>
                <FormControl mb={4}>
                  <FormLabel>Shift by days</FormLabel>
                  <HStack>
                    <Button size="sm" onClick={() => {}} colorScheme="red" variant="outline">
                      -7 Days
                    </Button>
                    <Button size="sm" onClick={() => {}} colorScheme="red" variant="outline">
                      -1 Day
                    </Button>
                    <Button size="sm" onClick={() => {}} colorScheme="green" variant="outline">
                      +1 Day
                    </Button>
                    <Button size="sm" onClick={() => {}} colorScheme="green" variant="outline">
                      +7 Days
                    </Button>
                  </HStack>
                </FormControl>
                <Button colorScheme="blue" size="sm" onClick={() => {}} isFullWidth>
                  Apply Shift
                </Button>
              </Box>

              <Divider />

              <Box>
                <Heading size="sm" mb={4}>Milestone Categories</Heading>

                {['submission', 'meeting', 'evaluation', 'other'].map(category => (
                  <Box key={category} mb={4} p={3} borderWidth="1px" borderRadius="md">
                    <Heading size="xs" textTransform="capitalize" mb={2}>
                      {category} Milestones
                    </Heading>

                    <FormControl mb={3}>
                      <FormLabel fontSize="sm">Shift only {category} milestones</FormLabel>
                      <HStack>
                        <Button size="xs" onClick={() => {}} colorScheme="red" variant="outline">
                          -7 Days
                        </Button>
                        <Button size="xs" onClick={() => {}} colorScheme="green" variant="outline">
                          +7 Days
                        </Button>
                      </HStack>
                    </FormControl>

                    <Text fontSize="xs" color="gray.600">
                      {timeline.filter(m => m.category === category).length} milestones in this category
                    </Text>
                  </Box>
                ))}
              </Box>

              <Box>
                <Heading size="sm" mb={4}>Timeline Presets</Heading>
                <VStack spacing={3} align="stretch">
                  <Button onClick={() => {}} variant="outline" size="sm">
                    Regular Semester (16 weeks)
                  </Button>
                  <Button onClick={() => {}} variant="outline" size="sm">
                    Summer Session (8 weeks)
                  </Button>
                  <Button onClick={() => {}} variant="outline" size="sm">
                    Extended Session (24 weeks)
                  </Button>
                </VStack>
              </Box>
            </VStack>
          </DrawerBody>
        </DrawerContent>
      </Drawer>
    </Box>
  );
};

export default EnhancedTimeline;