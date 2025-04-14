import React, { useState, useEffect } from 'react';
import {
  Box, Flex, VStack, HStack, Grid, GridItem, Heading, Text,
  Button, Select, Badge, Stat, StatLabel, StatNumber, StatHelpText,
  StatArrow, StatGroup, Table, Thead, Tbody, Tr, Th, Td,
  TableContainer, Avatar, Progress, Tooltip, useColorModeValue,
  useToast, Spinner, Input, IconButton, Menu, MenuButton, MenuList,
  MenuItem, Tabs, TabList, TabPanels, Tab, TabPanel, Divider
} from '@chakra-ui/react';
import {
  ChevronDownIcon, SearchIcon, DownloadIcon, RepeatIcon,
  InfoIcon, StarIcon, CheckCircleIcon, TimeIcon, EmailIcon
} from '@chakra-ui/icons';
import { useQuery } from 'react-query';
import { getSupervisorsPerformance, exportSupervisorsData } from '../../api/admin';
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip,
  Legend, ResponsiveContainer, RadarChart, Radar, PolarGrid,
  PolarAngleAxis, PolarRadiusAxis, ScatterChart, Scatter
} from 'recharts';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

const SupervisorPerformance = ({ sessionId }) => {
  const [timeframe, setTimeframe] = useState('month');
  const [sortField, setSortField] = useState('responseRate');
  const [sortOrder, setSortOrder] = useState('desc');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSupervisor, setSelectedSupervisor] = useState(null);
  const [activeTab, setActiveTab] = useState(0);
  const toast = useToast();
  const bgCard = useColorModeValue('white', 'gray.700');
  const bgHighlight = useColorModeValue('blue.50', 'blue.900');

  // Query to fetch supervisor performance data
  const { data, isLoading, error, refetch } = useQuery(
    ['supervisorsPerformance', sessionId, timeframe],
    () => getSupervisorsPerformance(sessionId, { timeframe }),
    {
      enabled: !!sessionId,
      refetchInterval: 300000, // Refetch every 5 minutes
    }
  );

  // Filter and sort supervisors based on search and sort settings
  const filteredSupervisors = React.useMemo(() => {
    if (!data?.supervisors) return [];

    return data.supervisors
      .filter(supervisor =>
        supervisor.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        supervisor.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        supervisor.department?.toLowerCase().includes(searchQuery.toLowerCase())
      )
      .sort((a, b) => {
        if (sortOrder === 'asc') {
          return a[sortField] - b[sortField];
        } else {
          return b[sortField] - a[sortField];
        }
      });
  }, [data, searchQuery, sortField, sortOrder]);

  // Handle exporting data
  const handleExportData = async (format = 'csv') => {
    try {
      await exportSupervisorsData(sessionId, { format, timeframe });
      toast({
        title: 'Export successful',
        description: `Data has been exported in ${format.toUpperCase()} format.`,
        status: 'success',
        duration: 3000,
        isClosable: true,
      });
    } catch (error) {
      toast({
        title: 'Export failed',
        description: error.message || 'An error occurred during export',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    }
  };

  // Handle refresh data
  const handleRefresh = () => {
    refetch();
    toast({
      title: 'Refreshing data',
      status: 'info',
      duration: 2000,
      isClosable: true,
    });
  };

  // Handle sort change
  const handleSortChange = (field) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
  };

  // Open supervisor details
  const openSupervisorDetails = (supervisor) => {
    setSelectedSupervisor(supervisor);
    setActiveTab(0);
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
        <Heading size="md" color="red.500">Error Loading Data</Heading>
        <Text>{error.message || 'An error occurred while loading performance data'}</Text>
      </Box>
    );
  }

  return (
    <Box p={4}>
      <Flex justify="space-between" align="center" mb={6}>
        <Heading size="lg">Supervisor Performance</Heading>
        <HStack>
          <IconButton
            icon={<RepeatIcon />}
            aria-label="Refresh data"
            onClick={handleRefresh}
            isLoading={isLoading}
          />
          <Menu>
            <MenuButton as={Button} rightIcon={<ChevronDownIcon />} variant="outline">
              Export
            </MenuButton>
            <MenuList>
              <MenuItem onClick={() => handleExportData('csv')}>Export as CSV</MenuItem>
              <MenuItem onClick={() => handleExportData('excel')}>Export as Excel</MenuItem>
              <MenuItem onClick={() => handleExportData('pdf')}>Export as PDF</MenuItem>
            </MenuList>
          </Menu>
        </HStack>
      </Flex>

      <Grid templateColumns="repeat(12, 1fr)" gap={6} mb={6}>
        {/* Summary Statistics */}
        <GridItem colSpan={{ base: 12, md: 8 }}>
          <Grid templateColumns="repeat(4, 1fr)" gap={4}>
            <GridItem colSpan={{ base: 2, md: 1 }}>
              <Stat bg={bgCard} p={4} borderRadius="md" boxShadow="sm">
                <StatLabel>Avg. Response Time</StatLabel>
                <StatNumber>{data?.summary?.avgResponseHours.toFixed(1)}h</StatNumber>
                <StatHelpText>
                  <StatArrow
                    type={data?.summary?.responseTimeTrend === 'down' ? 'decrease' : 'increase'}
                  />
                  {data?.summary?.responseTimeChange}% since last {timeframe}
                </StatHelpText>
              </Stat>
            </GridItem>
            <GridItem colSpan={{ base: 2, md: 1 }}>
              <Stat bg={bgCard} p={4} borderRadius="md" boxShadow="sm">
                <StatLabel>Feedback Quality</StatLabel>
                <StatNumber>{data?.summary?.avgFeedbackQuality.toFixed(1)}/5</StatNumber>
                <StatHelpText>
                  <StatArrow
                    type={data?.summary?.feedbackQualityTrend === 'up' ? 'increase' : 'decrease'}
                  />
                  {data?.summary?.feedbackQualityChange}% since last {timeframe}
                </StatHelpText>
              </Stat>
            </GridItem>
            <GridItem colSpan={{ base: 2, md: 1 }}>
              <Stat bg={bgCard} p={4} borderRadius="md" boxShadow="sm">
                <StatLabel>Meeting Completion</StatLabel>
                <StatNumber>{data?.summary?.meetingCompletionRate}%</StatNumber>
                <StatHelpText>
                  <StatArrow
                    type={data?.summary?.meetingCompletionTrend === 'up' ? 'increase' : 'decrease'}
                  />
                  {data?.summary?.meetingCompletionChange}% since last {timeframe}
                </StatHelpText>
              </Stat>
            </GridItem>
            <GridItem colSpan={{ base: 2, md: 1 }}>
              <Stat bg={bgCard} p={4} borderRadius="md" boxShadow="sm">
                <StatLabel>Student Satisfaction</StatLabel>
                <StatNumber>{data?.summary?.avgSatisfactionScore.toFixed(1)}/5</StatNumber>
                <StatHelpText>
                  <StatArrow
                    type={data?.summary?.satisfactionTrend === 'up' ? 'increase' : 'decrease'}
                  />
                  {data?.summary?.satisfactionChange}% since last {timeframe}
                </StatHelpText>
              </Stat>
            </GridItem>
          </Grid>
        </GridItem>

        {/* Timeframe Selector */}
        <GridItem colSpan={{ base: 12, md: 4 }}>
          <Box bg={bgCard} p={4} borderRadius="md" boxShadow="sm" h="100%">
            <Heading size="sm" mb={3}>Analysis Timeframe</Heading>
            <Select
              value={timeframe}
              onChange={(e) => setTimeframe(e.target.value)}
              mb={2}
            >
              <option value="week">Last Week</option>
              <option value="month">Last Month</option>
              <option value="quarter">Last Quarter</option>
              <option value="session">Current Session</option>
              <option value="year">Last Year</option>
            </Select>
            <Text fontSize="sm" color="gray.500">
              Data last updated: {data?.lastUpdated ? new Date(data.lastUpdated).toLocaleString() : 'N/A'}
            </Text>
          </Box>
        </GridItem>
      </Grid>

      {/* Performance Overview Charts */}
      <Grid templateColumns="repeat(12, 1fr)" gap={6} mb={6}>
        <GridItem colSpan={{ base: 12, md: 6 }}>
          <Box bg={bgCard} p={4} borderRadius="md" boxShadow="sm" h="100%">
            <Heading size="sm" mb={4}>Response Time Distribution</Heading>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart
                data={data?.responseTimeDistribution || []}
                margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="range" />
                <YAxis />
                <RechartsTooltip />
                <Bar dataKey="count" fill="#8884d8" />
              </BarChart>
            </ResponsiveContainer>
          </Box>
        </GridItem>

        <GridItem colSpan={{ base: 12, md: 6 }}>
          <Box bg={bgCard} p={4} borderRadius="md" boxShadow="sm" h="100%">
            <Heading size="sm" mb={4}>Feedback Quality by Department</Heading>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart
                data={data?.feedbackByDepartment || []}
                margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                layout="vertical"
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" domain={[0, 5]} />
                <YAxis dataKey="department" type="category" width={100} />
                <RechartsTooltip />
                <Bar dataKey="avgQuality" fill="#82ca9d" />
              </BarChart>
            </ResponsiveContainer>
          </Box>
        </GridItem>
      </Grid>

      {/* Supervisor List and Search */}
      <Grid templateColumns="repeat(12, 1fr)" gap={6}>
        <GridItem colSpan={{ base: 12, md: selectedSupervisor ? 6 : 12 }}>
          <Box bg={bgCard} p={4} borderRadius="md" boxShadow="sm">
            <Flex justify="space-between" align="center" mb={4}>
              <Heading size="md">Supervisors</Heading>
              <HStack>
                <Flex>
                  <Input
                    placeholder="Search supervisors..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    size="sm"
                  />
                  <IconButton
                    ml={2}
                    icon={<SearchIcon />}
                    aria-label="Search"
                    size="sm"
                  />
                </Flex>
                <Select
                  size="sm"
                  w="180px"
                  value={`${sortField}-${sortOrder}`}
                  onChange={(e) => {
                    const [field, order] = e.target.value.split('-');
                    setSortField(field);
                    setSortOrder(order);
                  }}
                >
                  <option value="responseRate-desc">Response Rate (High-Low)</option>
                  <option value="responseRate-asc">Response Rate (Low-High)</option>
                  <option value="avgResponseTime-asc">Response Time (Fast-Slow)</option>
                  <option value="avgResponseTime-desc">Response Time (Slow-Fast)</option>
                  <option value="feedbackQuality-desc">Feedback Quality (High-Low)</option>
                  <option value="feedbackQuality-asc">Feedback Quality (Low-High)</option>
                  <option value="meetingRate-desc">Meeting Rate (High-Low)</option>
                  <option value="meetingRate-asc">Meeting Rate (Low-High)</option>
                </Select>
              </HStack>
            </Flex>

            <TableContainer>
              <Table variant="simple" size="sm">
                <Thead>
                  <Tr>
                    <Th>Supervisor</Th>
                    <Th isNumeric>Response Rate</Th>
                    <Th isNumeric>Avg. Response</Th>
                    <Th isNumeric>Feedback Quality</Th>
                    <Th isNumeric>Meeting Rate</Th>
                  </Tr>
                </Thead>
                <Tbody>
                  {filteredSupervisors.map((supervisor) => (
                    <Tr
                      key={supervisor.id}
                      onClick={() => openSupervisorDetails(supervisor)}
                      cursor="pointer"
                      _hover={{ bg: bgHighlight }}
                      bg={selectedSupervisor?.id === supervisor.id ? bgHighlight : 'transparent'}
                    >
                      <Td>
                        <Flex align="center">
                          <Avatar
                            size="sm"
                            name={supervisor.name}
                            src={supervisor.avatar}
                            mr={2}
                          />
                          <Box>
                            <Text fontWeight="medium">{supervisor.name}</Text>
                            <Text fontSize="xs" color="gray.500">{supervisor.department}</Text>
                          </Box>
                        </Flex>
                      </Td>
                      <Td isNumeric>
                        <Badge
                          colorScheme={
                            supervisor.responseRate >= 90 ? 'green' :
                            supervisor.responseRate >= 75 ? 'blue' :
                            supervisor.responseRate >= 60 ? 'yellow' : 'red'
                          }
                        >
                          {supervisor.responseRate}%
                        </Badge>
                      </Td>
                      <Td isNumeric>
                        <Text
                          fontWeight="medium"
                          color={
                            supervisor.avgResponseTime <= 12 ? 'green.500' :
                            supervisor.avgResponseTime <= 24 ? 'blue.500' :
                            supervisor.avgResponseTime <= 48 ? 'yellow.500' : 'red.500'
                          }
                        >
                          {supervisor.avgResponseTime}h
                        </Text>
                      </Td>
                      <Td isNumeric>
                        <HStack justify="flex-end">
                          <Text>{supervisor.feedbackQuality.toFixed(1)}</Text>
                          <Box>
                            {[...Array(5)].map((_, i) => (
                              <StarIcon
                                key={i}
                                color={i < Math.round(supervisor.feedbackQuality) ? 'yellow.400' : 'gray.300'}
                                boxSize={3}
                              />
                            ))}
                          </Box>
                        </HStack>
                      </Td>
                      <Td isNumeric>
                        {supervisor.meetingRate}%
                      </Td>
                    </Tr>
                  ))}
                </Tbody>
              </Table>
            </TableContainer>

            {filteredSupervisors.length === 0 && (
              <Box textAlign="center" py={4}>
                <Text color="gray.500">No supervisors found matching your search criteria.</Text>
              </Box>
            )}

            <Text fontSize="sm" color="gray.500" mt={2}>
              Showing {filteredSupervisors.length} of {data?.supervisors?.length || 0} supervisors
            </Text>
          </Box>
        </GridItem>

        {/* Supervisor Detail View */}
        {selectedSupervisor && (
          <GridItem colSpan={{ base: 12, md: 6 }}>
            <Box bg={bgCard} p={4} borderRadius="md" boxShadow="sm">
              <Flex justify="space-between" align="center" mb={4}>
                <Flex align="center">
                  <Avatar
                    size="md"
                    name={selectedSupervisor.name}
                    src={selectedSupervisor.avatar}
                    mr={3}
                  />
                  <Box>
                    <Heading size="md">{selectedSupervisor.name}</Heading>
                    <Text color="gray.500">{selectedSupervisor.department} • {selectedSupervisor.email}</Text>
                  </Box>
                </Flex>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setSelectedSupervisor(null)}
                >
                  Close
                </Button>
              </Flex>

              <Tabs isFitted variant="enclosed" onChange={(index) => setActiveTab(index)} index={activeTab}>
                <TabList mb="1em">
                  <Tab>Overview</Tab>
                  <Tab>Performance</Tab>
                  <Tab>Feedback</Tab>
                  <Tab>Projects</Tab>
                </TabList>
                <TabPanels>
                  {/* Overview Tab */}
                  <TabPanel>
                    <Grid templateColumns="repeat(2, 1fr)" gap={4} mb={4}>
                      <GridItem>
                        <Stat>
                          <StatLabel>Teams Supervised</StatLabel>
                          <StatNumber>{selectedSupervisor.teamCount}</StatNumber>
                        </Stat>
                      </GridItem>
                      <GridItem>
                        <Stat>
                          <StatLabel>Students Mentored</StatLabel>
                          <StatNumber>{selectedSupervisor.studentCount}</StatNumber>
                        </Stat>
                      </GridItem>
                      <GridItem>
                        <Stat>
                          <StatLabel>Projects Completed</StatLabel>
                          <StatNumber>{selectedSupervisor.completedProjects}</StatNumber>
                        </Stat>
                      </GridItem>
                      <GridItem>
                        <Stat>
                          <StatLabel>Average Team Rating</StatLabel>
                          <StatNumber>
                            {selectedSupervisor.avgTeamRating.toFixed(1)}
                            <Box as="span" fontSize="lg">/5</Box>
                          </StatNumber>
                        </Stat>
                      </GridItem>
                    </Grid>

                    <Divider my={4} />

                    <Box mb={4}>
                      <Heading size="sm" mb={2}>Performance Summary</Heading>
                      <ResponsiveContainer width="100%" height={200}>
                        <RadarChart
                          outerRadius={90}
                          data={selectedSupervisor.performanceMetrics}
                        >
                          <PolarGrid />
                          <PolarAngleAxis dataKey="metric" />
                          <PolarRadiusAxis domain={[0, 100]} />
                          <Radar
                            name="Performance"
                            dataKey="value"
                            stroke="#8884d8"
                            fill="#8884d8"
                            fillOpacity={0.6}
                          />
                        </RadarChart>
                      </ResponsiveContainer>
                    </Box>

                    <Box>
                      <Heading size="sm" mb={2}>Recent Activity</Heading>
                      <VStack align="stretch" spacing={2}>
                        {selectedSupervisor.recentActivities?.map((activity, index) => (
                          <HStack key={index} p={2} bg="gray.50" borderRadius="md">
                            {activity.type === 'feedback' && <CheckCircleIcon color="green.500" />}
                            {activity.type === 'meeting' && <TimeIcon color="blue.500" />}
                            {activity.type === 'email' && <EmailIcon color="orange.500" />}
                            <Box>
                              <Text fontSize="sm">{activity.description}</Text>
                              <Text fontSize="xs" color="gray.500">
                                {new Date(activity.timestamp).toLocaleString()}
                              </Text>
                            </Box>
                          </HStack>
                        ))}
                      </VStack>
                    </Box>
                  </TabPanel>

                  {/* Performance Tab */}
                  <TabPanel>
                    <VStack spacing={6} align="stretch">
                      <Box>
                        <Heading size="sm" mb={3}>Response Time Trend</Heading>
                        <ResponsiveContainer width="100%" height={200}>
                          <LineChart
                            data={selectedSupervisor.responseTrend}
                            margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                          >
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="date" />
                            <YAxis />
                            <RechartsTooltip />
                            <Line
                              type="monotone"
                              dataKey="hours"
                              stroke="#8884d8"
                              activeDot={{ r: 8 }}
                              name="Response Time (hours)"
                            />
                          </LineChart>
                        </ResponsiveContainer>
                      </Box>

                      <Box>
                        <Heading size="sm" mb={3}>Feedback Quality Trend</Heading>
                        <ResponsiveContainer width="100%" height={200}>
                          <LineChart
                            data={selectedSupervisor.feedbackTrend}
                            margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                          >
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="date" />
                            <YAxis domain={[0, 5]} />
                            <RechartsTooltip />
                            <Line
                              type="monotone"
                              dataKey="quality"
                              stroke="#82ca9d"
                              activeDot={{ r: 8 }}
                              name="Feedback Quality (0-5)"
                            />
                          </LineChart>
                        </ResponsiveContainer>
                      </Box>

                      <Box>
                        <Heading size="sm" mb={3}>Communication Channels</Heading>
                        <ResponsiveContainer width="100%" height={200}>
                          <PieChart>
                            <Pie
                              data={selectedSupervisor.communicationChannels}
                              cx="50%"
                              cy="50%"
                              labelLine={false}
                              outerRadius={80}
                              fill="#8884d8"
                              dataKey="value"
                              label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                            >
                              {selectedSupervisor.communicationChannels.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                              ))}
                            </Pie>
                            <RechartsTooltip />
                          </PieChart>
                        </ResponsiveContainer>
                      </Box>
                    </VStack>
                  </TabPanel>

                  {/* Feedback Tab */}
                  <TabPanel>
                    <VStack align="stretch" spacing={4}>
                      <Box>
                        <Heading size="sm" mb={3}>Student Feedback</Heading>
                        {selectedSupervisor.studentFeedback?.map((feedback, index) => (
                          <Box
                            key={index}
                            p={3}
                            mb={3}
                            borderWidth="1px"
                            borderRadius="md"
                            borderLeftWidth="4px"
                            borderLeftColor={
                              feedback.rating >= 4 ? 'green.400' :
                              feedback.rating >= 3 ? 'blue.400' :
                              feedback.rating >= 2 ? 'yellow.400' : 'red.400'
                            }
                          >
                            <Flex justify="space-between" align="center" mb={2}>
                              <Text fontWeight="medium">
                                From: {feedback.anonymous ? 'Anonymous Student' : feedback.studentName}
                              </Text>
                              <HStack>
                                {[...Array(5)].map((_, i) => (
                                  <StarIcon
                                    key={i}
                                    color={i < feedback.rating ? 'yellow.400' : 'gray.300'}
                                    boxSize={4}
                                  />
                                ))}
                              </HStack>
                            </Flex>
                            <Text fontSize="sm">{feedback.comments}</Text>
                            <Text fontSize="xs" color="gray.500" mt={2}>
                              Submitted on {new Date(feedback.date).toLocaleDateString()}
                            </Text>
                          </Box>
                        ))}
                        {(!selectedSupervisor.studentFeedback || selectedSupervisor.studentFeedback.length === 0) && (
                          <Box p={4} textAlign="center">
                            <Text color="gray.500">No student feedback available</Text>
                          </Box>
                        )}
                      </Box>

                      <Box>
                        <Heading size="sm" mb={3}>Feedback Quality Analysis</Heading>
                        <TableContainer>
                          <Table variant="simple" size="sm">
                            <Thead>
                              <Tr>
                                <Th>Category</Th>
                                <Th isNumeric>Score</Th>
                                <Th isNumeric>Average</Th>
                                <Th>Status</Th>
                              </Tr>
                            </Thead>
                            <Tbody>
                              {selectedSupervisor.feedbackAnalysis?.map((item, index) => (
                                <Tr key={index}>
                                  <Td>{item.category}</Td>
                                  <Td isNumeric>{item.score.toFixed(1)}/5</Td>
                                  <Td isNumeric>{item.average.toFixed(1)}/5</Td>
                                  <Td>
                                    <Badge
                                      colorScheme={
                                        item.score > item.average + 0.5 ? 'green' :
                                        item.score < item.average - 0.5 ? 'red' : 'blue'
                                      }
                                    >
                                      {item.score > item.average + 0.5 ? 'Above Average' :
                                        item.score < item.average - 0.5 ? 'Below Average' : 'Average'}
                                    </Badge>
                                  </Td>
                                </Tr>
                              ))}
                            </Tbody>
                          </Table>
                        </TableContainer>
                      </Box>
                    </VStack>
                  </TabPanel>

                  {/* Projects Tab */}
                  <TabPanel>
                    <Box>
                      <Heading size="sm" mb={3}>Projects and Teams</Heading>
                      {selectedSupervisor.teams?.map((team, index) => (
                        <Box
                          key={index}
                          p={3}
                          mb={3}
                          borderWidth="1px"
                          borderRadius="md"
                        >
                          <Flex justify="space-between" align="center" mb={2}>
                            <Text fontWeight="medium">{team.name}</Text>
                            <Badge
                              colorScheme={
                                team.status === 'completed' ? 'green' :
                                team.status === 'in_progress' ? 'blue' :
                                team.status === 'at_risk' ? 'red' : 'gray'
                              }
                            >
                              {team.status === 'in_progress' ? 'In Progress' :
                               team.status === 'completed' ? 'Completed' :
                               team.status === 'at_risk' ? 'At Risk' : team.status}
                            </Badge>
                          </Flex>
                          <Text fontSize="sm" mb={2}>{team.projectTitle}</Text>
                          <Progress
                            value={team.progress}
                            colorScheme={
                              team.progress >= 75 ? 'green' :
                              team.progress >= 50 ? 'blue' :
                              team.progress >= 25 ? 'yellow' : 'red'
                            }
                            size="sm"
                            mb={2}
                          />
                          <Flex justify="space-between" align="center" fontSize="xs" color="gray.500">
                            <Text>Progress: {team.progress}%</Text>
                            <Text>Members: {team.memberCount}</Text>
                            <Text>
                              Last Updated: {new Date(team.lastUpdated).toLocaleDateString()}
                            </Text>
                          </Flex>
                        </Box>
                      ))}
                      {(!selectedSupervisor.teams || selectedSupervisor.teams.length === 0) && (
                        <Box p={4} textAlign="center">
                          <Text color="gray.500">No teams assigned yet</Text>
                        </Box>
                      )}
                    </Box>
                  </TabPanel>
                </TabPanels>
              </Tabs>
            </Box>
          </GridItem>
        )}
      </Grid>
    </Box>
  );
};

export default SupervisorPerformance;