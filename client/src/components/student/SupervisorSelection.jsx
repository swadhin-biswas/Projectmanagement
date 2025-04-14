import React, { useState, useEffect } from 'react';
import {
  Box, Flex, VStack, HStack, Grid, Heading, Text, Button,
  Input, InputGroup, InputLeftElement, Avatar, Checkbox, Badge,
  useToast, Spinner, Divider, Modal, ModalOverlay, ModalContent,
  ModalHeader, ModalFooter, ModalBody, ModalCloseButton, useDisclosure,
  Tooltip, Tag, TagLabel, TagCloseButton, useColorModeValue, Icon,
  SimpleGrid, Card, CardHeader, CardBody, CardFooter, IconButton
} from '@chakra-ui/react';
import {
  SearchIcon, InfoIcon, CheckCircleIcon, WarningIcon, StarIcon,
  CheckIcon, CloseIcon, ArrowRightIcon, QuestionIcon, EditIcon
} from '@chakra-ui/icons';
import { FaUserTie, FaFilter, FaHistory } from 'react-icons/fa';
import { useMutation, useQuery, useQueryClient } from 'react-query';
import {
  getSupervisors,
  getStudentSupervisorPreferences,
  submitSupervisorPreferences,
  getSupervisorDetails
} from '../../api/student';

const MAX_SELECTIONS = 3;
const MIN_SELECTIONS = 2;

const SupervisorSelection = ({ sessionId, studentId, isReadOnly = false }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSupervisors, setSelectedSupervisors] = useState([]);
  const [supervisorRankings, setSupervisorRankings] = useState({});
  const [justification, setJustification] = useState({});
  const [showAll, setShowAll] = useState(false);
  const { isOpen, onOpen, onClose } = useDisclosure();
  const [currentSupervisor, setCurrentSupervisor] = useState(null);
  const [selectionHistory, setSelectionHistory] = useState([]);
  const toast = useToast();
  const queryClient = useQueryClient();
  const bgCard = useColorModeValue('white', 'gray.700');
  const bgHighlight = useColorModeValue('blue.50', 'blue.900');
  const borderColor = useColorModeValue('gray.200', 'gray.600');

  // Fetch supervisors
  const {
    data: supervisorsData,
    isLoading: isLoadingSupervisors,
    error: supervisorsError
  } = useQuery(
    ['supervisors', sessionId],
    () => getSupervisors(sessionId),
    { enabled: !!sessionId }
  );

  // Fetch student's existing preferences
  const {
    data: preferencesData,
    isLoading: isLoadingPreferences,
    error: preferencesError
  } = useQuery(
    ['supervisorPreferences', sessionId, studentId],
    () => getStudentSupervisorPreferences(sessionId, studentId),
    {
      enabled: !!sessionId && !!studentId,
      onSuccess: (data) => {
        if (data?.preferences) {
          // Set selected supervisors from preferences
          const selected = data.preferences.map(p => p.supervisorId);
          setSelectedSupervisors(selected);

          // Set rankings
          const rankings = {};
          data.preferences.forEach(p => {
            rankings[p.supervisorId] = p.rank;
          });
          setSupervisorRankings(rankings);

          // Set justifications
          const justifications = {};
          data.preferences.forEach(p => {
            justifications[p.supervisorId] = p.justification;
          });
          setJustification(justifications);

          // Set history
          if (data.history) {
            setSelectionHistory(data.history);
          }
        }
      }
    }
  );

  // Fetch supervisor details
  const {
    data: supervisorDetails,
    isLoading: isLoadingDetails,
    error: detailsError,
    refetch: refetchDetails
  } = useQuery(
    ['supervisorDetails', currentSupervisor?.id],
    () => getSupervisorDetails(currentSupervisor?.id),
    {
      enabled: !!currentSupervisor,
      staleTime: 300000 // 5 minutes
    }
  );

  // Submit preferences mutation
  const { mutate, isLoading: isSubmitting } = useMutation(
    (data) => submitSupervisorPreferences(sessionId, studentId, data),
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['supervisorPreferences', sessionId, studentId]);
        toast({
          title: 'Preferences submitted',
          description: 'Your supervisor preferences have been successfully submitted.',
          status: 'success',
          duration: 5000,
          isClosable: true,
        });
      },
      onError: (error) => {
        toast({
          title: 'Submission failed',
          description: error.message || 'Failed to submit preferences. Please try again.',
          status: 'error',
          duration: 5000,
          isClosable: true,
        });
      }
    }
  );

  // Toggle supervisor selection
  const toggleSupervisorSelection = (supervisorId) => {
    if (isReadOnly || isSubmitting) return;

    setSelectedSupervisors(prev => {
      if (prev.includes(supervisorId)) {
        // Remove from selected list
        const newSelected = prev.filter(id => id !== supervisorId);

        // Remove ranking
        const newRankings = { ...supervisorRankings };
        delete newRankings[supervisorId];
        setSupervisorRankings(newRankings);

        // Remove justification
        const newJustifications = { ...justification };
        delete newJustifications[supervisorId];
        setJustification(newJustifications);

        return newSelected;
      } else {
        // Check if max selections reached
        if (prev.length >= MAX_SELECTIONS) {
          toast({
            title: 'Maximum selections reached',
            description: `You can select up to ${MAX_SELECTIONS} supervisors.`,
            status: 'warning',
            duration: 3000,
            isClosable: true,
          });
          return prev;
        }

        // Add to selected list
        return [...prev, supervisorId];
      }
    });
  };

  // Set ranking for a supervisor
  const setRanking = (supervisorId, rank) => {
    if (isReadOnly || isSubmitting) return;

    // Check if another supervisor already has this rank
    const supervisorWithRank = Object.entries(supervisorRankings).find(
      ([id, r]) => r === rank && id !== supervisorId
    );

    // If so, swap rankings
    if (supervisorWithRank) {
      const [otherSupervisorId] = supervisorWithRank;
      const currentRank = supervisorRankings[supervisorId] || 0;

      setSupervisorRankings(prev => ({
        ...prev,
        [supervisorId]: rank,
        [otherSupervisorId]: currentRank
      }));
    } else {
      // Otherwise just set the new rank
      setSupervisorRankings(prev => ({
        ...prev,
        [supervisorId]: rank
      }));
    }
  };

  // Set justification for a supervisor
  const setJustificationText = (supervisorId, text) => {
    if (isReadOnly || isSubmitting) return;

    setJustification(prev => ({
      ...prev,
      [supervisorId]: text
    }));
  };

  // Handle opening supervisor details modal
  const handleOpenDetails = (supervisor) => {
    setCurrentSupervisor(supervisor);
    onOpen();
  };

  // Handle submission
  const handleSubmit = () => {
    // Validation
    if (selectedSupervisors.length < MIN_SELECTIONS) {
      toast({
        title: 'Not enough selections',
        description: `Please select at least ${MIN_SELECTIONS} supervisors.`,
        status: 'warning',
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    // Check if all selected supervisors have rankings
    const missingRanks = selectedSupervisors.filter(id => !supervisorRankings[id]);
    if (missingRanks.length > 0) {
      toast({
        title: 'Missing rankings',
        description: 'Please rank all your selected supervisors.',
        status: 'warning',
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    // Check if all selected supervisors have justifications
    const missingJustifications = selectedSupervisors.filter(
      id => !justification[id] || justification[id].trim().length < 10
    );
    if (missingJustifications.length > 0) {
      toast({
        title: 'Missing justifications',
        description: 'Please provide a detailed justification for all your selected supervisors (min 10 characters).',
        status: 'warning',
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    // Prepare data for submission
    const preferences = selectedSupervisors.map(supervisorId => ({
      supervisorId,
      rank: supervisorRankings[supervisorId],
      justification: justification[supervisorId]
    }));

    // Submit preferences
    mutate({ preferences });
  };

  // Filter supervisors based on search query
  const filteredSupervisors = React.useMemo(() => {
    if (!supervisorsData?.supervisors) return [];

    return supervisorsData.supervisors
      .filter(supervisor =>
        supervisor.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        supervisor.department.toLowerCase().includes(searchQuery.toLowerCase()) ||
        supervisor.specialization.toLowerCase().includes(searchQuery.toLowerCase()) ||
        supervisor.email.toLowerCase().includes(searchQuery.toLowerCase())
      )
      .slice(0, showAll ? undefined : 10);
  }, [supervisorsData, searchQuery, showAll]);

  // Get approval status display
  const getApprovalStatus = () => {
    if (!preferencesData?.status) return null;

    switch(preferencesData.status) {
      case 'pending':
        return (
          <Tag size="lg" colorScheme="blue" borderRadius="full">
            <Icon as={QuestionIcon} mr={1} />
            <TagLabel>Pending Approval</TagLabel>
          </Tag>
        );
      case 'approved':
        return (
          <Tag size="lg" colorScheme="green" borderRadius="full">
            <Icon as={CheckCircleIcon} mr={1} />
            <TagLabel>Approved - {preferencesData.assignedSupervisor?.name}</TagLabel>
          </Tag>
        );
      case 'rejected':
        return (
          <Tag size="lg" colorScheme="red" borderRadius="full">
            <Icon as={WarningIcon} mr={1} />
            <TagLabel>Rejected - Please Resubmit</TagLabel>
          </Tag>
        );
      default:
        return null;
    }
  };

  // Loading state
  if (isLoadingSupervisors || isLoadingPreferences) {
    return (
      <Flex justify="center" align="center" h="200px">
        <Spinner size="xl" />
      </Flex>
    );
  }

  // Error state
  if (supervisorsError || preferencesError) {
    return (
      <Box p={4} bg="red.50" borderRadius="md">
        <Heading size="md" color="red.500">Error Loading Data</Heading>
        <Text>{supervisorsError?.message || preferencesError?.message || 'An error occurred'}</Text>
      </Box>
    );
  }

  return (
    <Box>
      <Flex justify="space-between" align="center" mb={6}>
        <Heading size="lg">Supervisor Selection</Heading>
        {getApprovalStatus()}
      </Flex>

      {preferencesData?.status === 'rejected' && preferencesData?.rejectionReason && (
        <Box p={4} bg="red.50" borderRadius="md" mb={6}>
          <Heading size="sm" mb={2}>Rejection Reason:</Heading>
          <Text>{preferencesData.rejectionReason}</Text>
        </Box>
      )}

      {/* Selection Requirements */}
      <Box p={4} bg={bgCard} borderRadius="md" boxShadow="sm" mb={6}>
        <Heading size="md" mb={3}>Requirements & Instructions</Heading>
        <Text mb={3}>
          Please select between {MIN_SELECTIONS} and {MAX_SELECTIONS} potential supervisors for your
          project. Rank them in order of preference and provide a brief justification for each selection.
        </Text>
        <HStack spacing={4} mb={3}>
          <Tag colorScheme="blue" size="lg">
            Current Selection: {selectedSupervisors.length}/{MAX_SELECTIONS}
          </Tag>
          {preferencesData?.deadlineDate && (
            <Tag colorScheme={
              new Date(preferencesData.deadlineDate) > new Date() ? "green" : "red"
            } size="lg">
              Deadline: {new Date(preferencesData.deadlineDate).toLocaleDateString()}
            </Tag>
          )}
        </HStack>
        <Text fontSize="sm" color="gray.500">
          Note: Your selections will be reviewed by the administrator, who will make the final assignment
          based on supervisor availability and workload.
        </Text>
      </Box>

      {/* Search and Selection Section */}
      <Grid templateColumns="repeat(12, 1fr)" gap={6}>
        {/* Available Supervisors */}
        <Box
          gridColumn={{ base: "span 12", md: "span 7" }}
          p={4}
          bg={bgCard}
          borderRadius="md"
          boxShadow="sm"
        >
          <Heading size="md" mb={4}>Available Supervisors</Heading>

          <InputGroup mb={4}>
            <InputLeftElement pointerEvents="none">
              <SearchIcon color="gray.300" />
            </InputLeftElement>
            <Input
              placeholder="Search by name, department, or specialization..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </InputGroup>

          <VStack spacing={3} align="stretch" mb={4}>
            {filteredSupervisors.map(supervisor => (
              <Flex
                key={supervisor.id}
                p={3}
                borderWidth="1px"
                borderRadius="md"
                borderColor={selectedSupervisors.includes(supervisor.id) ? "blue.500" : borderColor}
                bg={selectedSupervisors.includes(supervisor.id) ? bgHighlight : 'transparent'}
                justify="space-between"
                align="center"
              >
                <HStack spacing={3}>
                  <Avatar name={supervisor.name} src={supervisor.avatar} size="md" />
                  <Box>
                    <Flex align="center">
                      <Text fontWeight="medium">{supervisor.name}</Text>
                      {supervisor.availability === 'limited' && (
                        <Badge ml={2} colorScheme="orange">Limited Availability</Badge>
                      )}
                      {supervisor.availability === 'full' && (
                        <Badge ml={2} colorScheme="green">Available</Badge>
                      )}
                    </Flex>
                    <Text fontSize="sm" color="gray.500">{supervisor.department}</Text>
                    <Text fontSize="sm">{supervisor.specialization}</Text>
                  </Box>
                </HStack>

                <HStack>
                  <IconButton
                    size="sm"
                    icon={<InfoIcon />}
                    aria-label={`View ${supervisor.name}'s details`}
                    onClick={() => handleOpenDetails(supervisor)}
                  />

                  <Checkbox
                    isChecked={selectedSupervisors.includes(supervisor.id)}
                    onChange={() => toggleSupervisorSelection(supervisor.id)}
                    isDisabled={
                      isReadOnly ||
                      (supervisor.availability === 'unavailable') ||
                      (supervisor.availability === 'limited' &&
                       !selectedSupervisors.includes(supervisor.id) &&
                       selectedSupervisors.length >= MAX_SELECTIONS - 1)
                    }
                    colorScheme="blue"
                    size="lg"
                  />
                </HStack>
              </Flex>
            ))}

            {filteredSupervisors.length === 0 && (
              <Box textAlign="center" py={4}>
                <Text color="gray.500">No supervisors found matching your search criteria.</Text>
              </Box>
            )}
          </VStack>

          {filteredSupervisors.length < supervisorsData?.supervisors?.length && !showAll && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowAll(true)}
              width="100%"
            >
              Show All Supervisors
            </Button>
          )}
        </Box>

        {/* Selected Supervisors */}
        <Box
          gridColumn={{ base: "span 12", md: "span 5" }}
          p={4}
          bg={bgCard}
          borderRadius="md"
          boxShadow="sm"
        >
          <Heading size="md" mb={4}>Your Preferences</Heading>

          {selectedSupervisors.length === 0 ? (
            <Box
              p={6}
              textAlign="center"
              borderWidth="2px"
              borderStyle="dashed"
              borderRadius="md"
              borderColor="gray.300"
            >
              <Text color="gray.500">
                Select supervisors from the list to add them to your preferences
              </Text>
            </Box>
          ) : (
            <VStack spacing={4} align="stretch">
              {selectedSupervisors.map(supervisorId => {
                const supervisor = supervisorsData?.supervisors?.find(s => s.id === supervisorId);
                if (!supervisor) return null;

                return (
                  <Box
                    key={supervisorId}
                    p={4}
                    borderWidth="1px"
                    borderRadius="md"
                    borderColor={borderColor}
                  >
                    <Flex justify="space-between" align="center" mb={3}>
                      <HStack>
                        <Avatar name={supervisor.name} src={supervisor.avatar} size="sm" />
                        <Text fontWeight="medium">{supervisor.name}</Text>
                      </HStack>

                      {!isReadOnly && (
                        <IconButton
                          size="sm"
                          icon={<CloseIcon />}
                          aria-label={`Remove ${supervisor.name}`}
                          onClick={() => toggleSupervisorSelection(supervisorId)}
                          variant="ghost"
                          colorScheme="red"
                        />
                      )}
                    </Flex>

                    <Flex mb={3} align="center">
                      <Text mr={2}>Preference Rank:</Text>
                      <HStack spacing={1}>
                        {[1, 2, 3].map((rank) => (
                          <Button
                            key={rank}
                            size="xs"
                            colorScheme={supervisorRankings[supervisorId] === rank ? "blue" : "gray"}
                            onClick={() => setRanking(supervisorId, rank)}
                            isDisabled={isReadOnly}
                          >
                            {rank}
                          </Button>
                        ))}
                      </HStack>
                    </Flex>

                    <Box>
                      <Text mb={1}>Justification:</Text>
                      <Input
                        placeholder="Why is this supervisor a good match for your project?"
                        value={justification[supervisorId] || ''}
                        onChange={(e) => setJustificationText(supervisorId, e.target.value)}
                        size="sm"
                        isDisabled={isReadOnly}
                      />
                      {justification[supervisorId] && justification[supervisorId].length < 10 && (
                        <Text color="red.500" fontSize="xs" mt={1}>
                          Please provide a more detailed justification (min 10 characters)
                        </Text>
                      )}
                    </Box>
                  </Box>
                );
              })}
            </VStack>
          )}

          {selectedSupervisors.length > 0 && !isReadOnly && (
            <Button
              mt={4}
              colorScheme="blue"
              width="100%"
              onClick={handleSubmit}
              isLoading={isSubmitting}
              isDisabled={
                selectedSupervisors.length < MIN_SELECTIONS ||
                selectedSupervisors.some(id => !supervisorRankings[id]) ||
                selectedSupervisors.some(id => !justification[id] || justification[id].trim().length < 10)
              }
            >
              Submit Preferences
            </Button>
          )}
        </Box>
      </Grid>

      {/* Selection History */}
      {selectionHistory && selectionHistory.length > 0 && (
        <Box mt={6} p={4} bg={bgCard} borderRadius="md" boxShadow="sm">
          <Flex align="center" mb={4}>
            <Icon as={FaHistory} mr={2} />
            <Heading size="md">Selection History</Heading>
          </Flex>

          <VStack spacing={3} align="stretch">
            {selectionHistory.map((entry, index) => (
              <Box
                key={index}
                p={3}
                borderWidth="1px"
                borderRadius="md"
                borderColor={borderColor}
              >
                <Flex justify="space-between" align="center">
                  <Text fontWeight="medium">
                    {new Date(entry.timestamp).toLocaleDateString()} {new Date(entry.timestamp).toLocaleTimeString()}
                  </Text>
                  <Badge colorScheme={
                    entry.status === 'approved' ? 'green' :
                    entry.status === 'rejected' ? 'red' : 'blue'
                  }>
                    {entry.status.charAt(0).toUpperCase() + entry.status.slice(1)}
                  </Badge>
                </Flex>

                <VStack align="stretch" mt={2}>
                  {entry.preferences.map((pref, i) => (
                    <HStack key={i} spacing={4}>
                      <Text fontSize="sm" fontWeight="medium">Rank {pref.rank}:</Text>
                      <Text fontSize="sm">{pref.supervisorName}</Text>
                    </HStack>
                  ))}
                </VStack>

                {entry.adminComment && (
                  <Box mt={2} p={2} bg="gray.50" borderRadius="md">
                    <Text fontSize="sm" fontWeight="medium">Admin Comment:</Text>
                    <Text fontSize="sm">{entry.adminComment}</Text>
                  </Box>
                )}

                {entry.assignedSupervisor && (
                  <Flex mt={2} p={2} bg="green.50" borderRadius="md" align="center">
                    <CheckCircleIcon color="green.500" mr={2} />
                    <Text fontSize="sm" fontWeight="medium">
                      Assigned to: {entry.assignedSupervisor}
                    </Text>
                  </Flex>
                )}
              </Box>
            ))}
          </VStack>
        </Box>
      )}

      {/* Supervisor Details Modal */}
      <Modal isOpen={isOpen} onClose={onClose} size="xl">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>
            {currentSupervisor?.name}
          </ModalHeader>
          <ModalCloseButton />

          <ModalBody>
            {isLoadingDetails ? (
              <Flex justify="center" py={8}>
                <Spinner />
              </Flex>
            ) : detailsError ? (
              <Box p={4} bg="red.50" borderRadius="md">
                <Text color="red.500">Error loading supervisor details</Text>
              </Box>
            ) : (
              <Box>
                <Flex mb={6}>
                  <Avatar
                    size="xl"
                    name={currentSupervisor?.name}
                    src={supervisorDetails?.avatar}
                    mr={4}
                  />
                  <Box>
                    <Text fontSize="lg" fontWeight="bold">{currentSupervisor?.name}</Text>
                    <Text>{supervisorDetails?.title}</Text>
                    <Text color="gray.600">{currentSupervisor?.department}</Text>
                    <Text>{supervisorDetails?.email}</Text>
                    <HStack mt={2}>
                      <Badge colorScheme="blue">{supervisorDetails?.domain}</Badge>
                      {supervisorDetails?.tags?.map((tag, i) => (
                        <Badge key={i} colorScheme="purple">{tag}</Badge>
                      ))}
                    </HStack>
                  </Box>
                </Flex>

                <Divider mb={4} />

                <Heading size="md" mb={3}>About</Heading>
                <Text mb={4}>{supervisorDetails?.bio}</Text>

                <Heading size="md" mb={3}>Expertise</Heading>
                <SimpleGrid columns={2} spacing={4} mb={4}>
                  {supervisorDetails?.expertise?.map((item, i) => (
                    <HStack key={i} alignItems="center">
                      <CheckIcon color="green.500" />
                      <Text>{item}</Text>
                    </HStack>
                  ))}
                </SimpleGrid>

                <Heading size="md" mb={3}>Current Workload</Heading>
                <HStack spacing={4} mb={4}>
                  <Stat bg="blue.50" p={3} borderRadius="md">
                    <Text fontWeight="medium">Teams</Text>
                    <Text fontSize="2xl">{supervisorDetails?.currentTeams || 0}</Text>
                  </Stat>
                  <Stat bg="green.50" p={3} borderRadius="md">
                    <Text fontWeight="medium">Students</Text>
                    <Text fontSize="2xl">{supervisorDetails?.currentStudents || 0}</Text>
                  </Stat>
                  <Stat bg="purple.50" p={3} borderRadius="md">
                    <Text fontWeight="medium">Projects</Text>
                    <Text fontSize="2xl">{supervisorDetails?.currentProjects || 0}</Text>
                  </Stat>
                </HStack>

                {supervisorDetails?.publications && (
                  <>
                    <Heading size="md" mb={3}>Recent Publications</Heading>
                    <VStack align="stretch" spacing={2} mb={4}>
                      {supervisorDetails.publications.map((pub, i) => (
                        <Box key={i} p={2} borderWidth="1px" borderRadius="md">
                          <Text fontSize="sm">{pub.title}</Text>
                          <Text fontSize="xs" color="gray.500">{pub.journal}, {pub.year}</Text>
                        </Box>
                      ))}
                    </VStack>
                  </>
                )}

                {supervisorDetails?.projectAreas && (
                  <>
                    <Heading size="md" mb={3}>Preferred Project Areas</Heading>
                    <SimpleGrid columns={2} spacing={4}>
                      {supervisorDetails.projectAreas.map((area, i) => (
                        <Tag key={i} size="md" colorScheme="blue" m={1}>
                          {area}
                        </Tag>
                      ))}
                    </SimpleGrid>
                  </>
                )}
              </Box>
            )}
          </ModalBody>

          <ModalFooter>
            <Button
              colorScheme="blue"
              mr={3}
              onClick={() => {
                toggleSupervisorSelection(currentSupervisor?.id);
                onClose();
              }}
              isDisabled={
                isReadOnly ||
                currentSupervisor?.availability === 'unavailable' ||
                (currentSupervisor?.availability === 'limited' &&
                 !selectedSupervisors.includes(currentSupervisor?.id) &&
                 selectedSupervisors.length >= MAX_SELECTIONS - 1)
              }
            >
              {selectedSupervisors.includes(currentSupervisor?.id) ? 'Remove from Selection' : 'Add to Selection'}
            </Button>
            <Button variant="ghost" onClick={onClose}>Close</Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Box>
  );
};

export default SupervisorSelection;
