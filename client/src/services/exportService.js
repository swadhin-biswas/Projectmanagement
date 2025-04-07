import { api } from '../lib/api';

export const downloadProjectData = async (projectId, format = 'json') => {
  try {
    const response = await api.get(`/api/export/project/${projectId}`);
    const data = response.data.data;

    if (format === 'json') {
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      downloadBlob(blob, `project-${data.project.name}-export.json`);
    } else if (format === 'csv') {
      const csvContent = generateProjectCSV(data);
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      downloadBlob(blob, `project-${data.project.name}-export.csv`);
    }
  } catch (error) {
    console.error('Failed to download project data:', error);
    throw error;
  }
};

export const downloadTeamData = async (teamId, format = 'json') => {
  try {
    const response = await api.get(`/api/export/team/${teamId}`);
    const data = response.data.data;

    if (format === 'json') {
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      downloadBlob(blob, `team-${data.team.name}-export.json`);
    } else if (format === 'csv') {
      const csvContent = generateTeamCSV(data);
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      downloadBlob(blob, `team-${data.team.name}-export.csv`);
    }
  } catch (error) {
    console.error('Failed to download team data:', error);
    throw error;
  }
};

export const downloadTeamChat = async (teamId, format = 'json') => {
  try {
    const response = await api.get(`/api/export/team/${teamId}/chat`);
    const data = response.data.data;

    if (format === 'json') {
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      downloadBlob(blob, `team-chat-export.json`);
    } else if (format === 'csv') {
      const csvContent = generateChatCSV(data);
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      downloadBlob(blob, `team-chat-export.csv`);
    }
  } catch (error) {
    console.error('Failed to download team chat:', error);
    throw error;
  }
};

// Helper function to download blob
const downloadBlob = (blob, filename) => {
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  link.parentNode.removeChild(link);
  window.URL.revokeObjectURL(url);
};

// Helper function to convert project data to CSV format
const generateProjectCSV = (data) => {
  const headers = ['Project Name', 'Type', 'Status', 'Created At', 'Last Submitted'];
  const rows = [[
    data.project.name,
    data.project.type,
    data.project.status,
    data.project.createdAt,
    data.project.lastSubmittedAt || ''
  ]];

  // Add team members section
  rows.push(['', '', '', '', '']);
  rows.push(['Team Members', 'Email', 'Student ID', 'Role', 'Joined At']);
  data.team.members.forEach(member => {
    rows.push([
      member.fullName,
      member.email,
      member.studentId,
      member.role,
      member.joinedAt
    ]);
  });

  // Add submissions section
  rows.push(['', '', '', '', '']);
  rows.push(['Submission Title', 'Description', 'GitHub URL', 'Submitted By', 'Submitted At']);
  data.submissions.forEach(sub => {
    rows.push([
      sub.title,
      sub.description,
      sub.githubUrl,
      sub.submittedBy.fullName,
      sub.submittedAt
    ]);
  });

  return convertToCSV(rows);
};

// Helper function to convert team data to CSV format
const generateTeamCSV = (data) => {
  const headers = ['Team Name', 'Created At', 'Status'];
  const rows = [[
    data.team.name,
    data.team.createdAt,
    data.team.status
  ]];

  // Add members section
  rows.push(['', '', '']);
  rows.push(['Member Name', 'Email', 'Student ID', 'Role', 'Joined At']);
  data.team.members.forEach(member => {
    rows.push([
      member.fullName,
      member.email,
      member.studentId,
      member.role,
      member.joinedAt
    ]);
  });

  // Add projects section
  rows.push(['', '', '']);
  rows.push(['Project Name', 'Type', 'Status', 'Created At']);
  data.projects.forEach(project => {
    rows.push([
      project.name,
      project.type,
      project.status,
      project.createdAt
    ]);
  });

  return convertToCSV(rows);
};

// Helper function to convert chat data to CSV format
const generateChatCSV = (data) => {
  const headers = ['Sender', 'Message', 'Timestamp', 'Is Announcement'];
  const rows = [headers];

  data.forEach(msg => {
    rows.push([
      msg.sender,
      msg.content,
      msg.timestamp,
      msg.isAnnouncement ? 'Yes' : 'No'
    ]);
  });

  return convertToCSV(rows);
};

// Helper function to convert array of arrays to CSV string
const convertToCSV = (rows) => {
  return rows
    .map(row =>
      row.map(cell =>
        typeof cell === 'string' && cell.includes(',')
          ? `"${cell}"`
          : cell
      ).join(',')
    )
    .join('\n');
};