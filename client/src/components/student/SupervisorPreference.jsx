import {
  CheckIcon,
  CloseIcon,
  DragHandleIcon,
  SearchIcon,
} from "@chakra-ui/icons";
import {
  Alert,
  AlertDescription,
  AlertIcon,
  AlertTitle,
  Avatar,
  Badge,
  Box,
  Button,
  Card,
  CardBody,
  Divider,
  Flex,
  FormControl,
  FormLabel,
  Heading,
  HStack,
  IconButton,
  Input,
  List,
  ListItem,
  Spinner,
  Text,
  Textarea,
  useToast,
  VStack,
} from "@chakra-ui/react";
import { useMutation, useQuery } from "@tanstack/react-query";
import React, { useState } from "react";
import { DragDropContext, Draggable, Droppable } from "react-beautiful-dnd";
import {
  getAvailableSupervisors,
  getStudentSupervisorPreferences,
  submitSupervisorPreferences,
} from "../../api/student";

const SupervisorPreference = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedSupervisors, setSelectedSupervisors] = useState([]);
  const [preferencesData, setPreferencesData] = useState({
    submitted: false,
    approved: null,
    rejectionReason: "",
  });

  const toast = useToast();

  // Fetch available supervisors
  const { data: availableSupervisors = [], isLoading: loadingSupervisors } =
    useQuery("availableSupervisors", getAvailableSupervisors);

  // Fetch existing preferences if any
  const { data: existingPreferences, isLoading: loadingPreferences } = useQuery(
    "studentSupervisorPreferences",
    getStudentSupervisorPreferences,
    {
      onSuccess: (data) => {
        if (data && data.preferences) {
          setSelectedSupervisors(
            data.preferences.map((pref) => ({
              ...pref.supervisor,
              reason: pref.reason,
              rank: pref.rank,
            }))
          );

          setPreferencesData({
            submitted: true,
            approved: data.approved,
            rejectionReason: data.rejectionReason || "",
          });
        }
      },
    }
  );

  // Submit preferences mutation
  const { mutate: submitPreferences, isLoading: submitting } = useMutation(
    (data) => submitSupervisorPreferences(data),
    {
      onSuccess: (response) => {
        toast({
          title: "Preferences submitted",
          description:
            "Your supervisor preferences have been submitted successfully",
          status: "success",
          duration: 5000,
          isClosable: true,
        });

        setPreferencesData({
          ...preferencesData,
          submitted: true,
        });
      },
      onError: (error) => {
        toast({
          title: "Error submitting preferences",
          description: error.message || "An error occurred. Please try again.",
          status: "error",
          duration: 5000,
          isClosable: true,
        });
      },
    }
  );

  // Filter supervisors based on search term
  const filteredSupervisors = availableSupervisors.filter((supervisor) => {
    return (
      (supervisor.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        supervisor.specialization
          .toLowerCase()
          .includes(searchTerm.toLowerCase()) ||
        supervisor.department
          .toLowerCase()
          .includes(searchTerm.toLowerCase())) &&
      !selectedSupervisors.some((selected) => selected._id === supervisor._id)
    );
  });

  // Handle drag end for reordering
  const handleDragEnd = (result) => {
    if (!result.destination) return;

    const items = Array.from(selectedSupervisors);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    // Update ranks after reordering
    const updatedItems = items.map((item, index) => ({
      ...item,
      rank: index + 1,
    }));

    setSelectedSupervisors(updatedItems);
  };

  // Add supervisor to selection
  const addSupervisor = (supervisor) => {
    if (selectedSupervisors.length >= 3) {
      toast({
        title: "Maximum selections reached",
        description: "You can select up to 3 supervisors",
        status: "warning",
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    setSelectedSupervisors([
      ...selectedSupervisors,
      {
        ...supervisor,
        rank: selectedSupervisors.length + 1,
        reason: "",
      },
    ]);
    setSearchTerm("");
  };

  // Remove supervisor from selection
  const removeSupervisor = (supervisorId) => {
    const filtered = selectedSupervisors
      .filter((supervisor) => supervisor._id !== supervisorId)
      .map((supervisor, index) => ({
        ...supervisor,
        rank: index + 1,
      }));

    setSelectedSupervisors(filtered);
  };

  // Update reason for selecting a supervisor
  const updateReason = (supervisorId, reason) => {
    setSelectedSupervisors(
      selectedSupervisors.map((supervisor) =>
        supervisor._id === supervisorId ? { ...supervisor, reason } : supervisor
      )
    );
  };

  // Handle form submission
  const handleSubmit = () => {
    // Validate that all selected supervisors have reasons
    const missingReasons = selectedSupervisors.some(
      (supervisor) => !supervisor.reason.trim()
    );

    if (missingReasons) {
      toast({
        title: "Missing information",
        description: "Please provide a reason for each selected supervisor",
        status: "error",
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    if (selectedSupervisors.length === 0) {
      toast({
        title: "No supervisors selected",
        description: "Please select at least one supervisor",
        status: "error",
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    // Format data for submission
    const formattedPreferences = selectedSupervisors.map((supervisor) => ({
      supervisorId: supervisor._id,
      rank: supervisor.rank,
      reason: supervisor.reason,
    }));

    submitPreferences({ preferences: formattedPreferences });
  };

  // Render approval status
  const renderApprovalStatus = () => {
    if (!preferencesData.submitted) return null;

    if (preferencesData.approved === null) {
      return (
        <Alert status="info" borderRadius="md" mb={4}>
          <AlertIcon />
          <Box>
            <AlertTitle>Pending Approval</AlertTitle>
            <AlertDescription>
              Your supervisor preferences are awaiting admin approval
            </AlertDescription>
          </Box>
        </Alert>
      );
    } else if (preferencesData.approved) {
      return (
        <Alert status="success" borderRadius="md" mb={4}>
          <AlertIcon />
          <Box>
            <AlertTitle>Approved</AlertTitle>
            <AlertDescription>
              Your supervisor preferences have been approved
            </AlertDescription>
          </Box>
        </Alert>
      );
    } else {
      return (
        <Alert status="error" borderRadius="md" mb={4}>
          <AlertIcon />
          <Box>
            <AlertTitle>Not Approved</AlertTitle>
            <AlertDescription>
              {preferencesData.rejectionReason ||
                "Please review and update your preferences"}
            </AlertDescription>
          </Box>
        </Alert>
      );
    }
  };

  if (loadingPreferences) {
    return (
      <Flex justify="center" align="center" h="300px">
        <Spinner size="xl" />
      </Flex>
    );
  }

  return (
    <Box p={4}>
      <Heading size="lg" mb={6}>
        Supervisor Preferences
      </Heading>

      {renderApprovalStatus()}

      {/* Selected Supervisors Section */}
      <Box mb={6}>
        <Heading size="md" mb={4}>
          Your Preferences{" "}
          {selectedSupervisors.length > 0 &&
            `(${selectedSupervisors.length}/3)`}
        </Heading>

        <DragDropContext onDragEnd={handleDragEnd}>
          <Droppable droppableId="supervisors">
            {(provided) => (
              <VStack
                {...provided.droppableProps}
                ref={provided.innerRef}
                spacing={4}
                align="stretch"
                w="100%"
              >
                {selectedSupervisors.map((supervisor, index) => (
                  <Draggable
                    key={supervisor._id}
                    draggableId={supervisor._id}
                    index={index}
                    isDragDisabled={preferencesData.approved !== null}
                  >
                    {(provided) => (
                      <Card
                        ref={provided.innerRef}
                        {...provided.draggableProps}
                        borderWidth="1px"
                      >
                        <CardBody>
                          <Flex mb={2} align="center">
                            <HStack {...provided.dragHandleProps} mr={2}>
                              <DragHandleIcon />
                              <Badge colorScheme="blue">
                                Rank {supervisor.rank}
                              </Badge>
                            </HStack>

                            <Heading size="sm" flex="1">
                              {supervisor.name}
                            </Heading>

                            {preferencesData.approved === null && (
                              <IconButton
                                size="sm"
                                icon={<CloseIcon />}
                                aria-label="Remove supervisor"
                                onClick={() => removeSupervisor(supervisor._id)}
                              />
                            )}
                          </Flex>

                          <Text fontSize="sm" mb={2}>
                            <strong>Specialization:</strong>{" "}
                            {supervisor.specialization}
                          </Text>

                          <Text fontSize="sm" mb={3}>
                            <strong>Department:</strong> {supervisor.department}
                          </Text>

                          <FormControl>
                            <FormLabel fontSize="sm">
                              Reason for selecting this supervisor
                            </FormLabel>
                            <Textarea
                              value={supervisor.reason || ""}
                              onChange={(e) =>
                                updateReason(supervisor._id, e.target.value)
                              }
                              placeholder="Explain why you want this supervisor..."
                              size="sm"
                              isDisabled={preferencesData.approved !== null}
                            />
                          </FormControl>
                        </CardBody>
                      </Card>
                    )}
                  </Draggable>
                ))}
                {provided.placeholder}
              </VStack>
            )}
          </Droppable>
        </DragDropContext>

        {selectedSupervisors.length === 0 && (
          <Text color="gray.500" textAlign="center" py={4}>
            No supervisors selected yet. You can select up to 3 supervisors.
          </Text>
        )}
      </Box>

      {/* Search and Add Supervisors Section */}
      {preferencesData.approved === null && (
        <>
          <Divider mb={6} />

          <Box mb={6}>
            <Heading size="md" mb={4}>
              Available Supervisors
            </Heading>

            <HStack mb={4}>
              <Input
                placeholder="Search by name, specialization, or department"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                flex="1"
              />
              <IconButton
                icon={<SearchIcon />}
                aria-label="Search supervisors"
              />
            </HStack>

            {loadingSupervisors ? (
              <Flex justify="center" py={4}>
                <Spinner />
              </Flex>
            ) : (
              <List spacing={3}>
                {filteredSupervisors.length > 0 ? (
                  filteredSupervisors.map((supervisor) => (
                    <ListItem
                      key={supervisor._id}
                      p={3}
                      borderWidth="1px"
                      borderRadius="md"
                      _hover={{ bg: "gray.50" }}
                    >
                      <Flex align="center">
                        <Avatar
                          size="sm"
                          name={supervisor.name}
                          src={supervisor.avatar}
                          mr={3}
                        />
                        <Box flex="1">
                          <Text fontWeight="bold">{supervisor.name}</Text>
                          <Text fontSize="sm">
                            {supervisor.specialization} •{" "}
                            {supervisor.department}
                          </Text>
                        </Box>
                        <Button
                          size="sm"
                          colorScheme="blue"
                          onClick={() => addSupervisor(supervisor)}
                          leftIcon={<CheckIcon />}
                        >
                          Select
                        </Button>
                      </Flex>
                    </ListItem>
                  ))
                ) : (
                  <Text color="gray.500" textAlign="center" py={4}>
                    {searchTerm
                      ? "No matching supervisors found"
                      : "No more supervisors available"}
                  </Text>
                )}
              </List>
            )}
          </Box>

          <Flex justify="flex-end">
            <Button
              colorScheme="blue"
              onClick={handleSubmit}
              isLoading={submitting}
              loadingText="Submitting"
              isDisabled={selectedSupervisors.length === 0}
            >
              {preferencesData.submitted
                ? "Update Preferences"
                : "Submit Preferences"}
            </Button>
          </Flex>
        </>
      )}
    </Box>
  );
};

export default SupervisorPreference;
