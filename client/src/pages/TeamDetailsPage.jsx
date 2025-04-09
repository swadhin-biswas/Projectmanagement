import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom"; // Assuming you use React Router for routing
import { getTeamDetailsById } from "../services/api"; // Adjust path if needed

// Basic Loading and Error components (replace with your actual components)
const LoadingSpinner = () => <div>Loading team details...</div>;
const ErrorDisplay = ({ message }) => <div>Error: {message}</div>;

const TeamDetailsPage = () => {
  const { teamId } = useParams(); // Get teamId from the URL path (e.g., /teams/:teamId)
  const [teamDetails, setTeamDetails] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!teamId) {
      setError("No Team ID provided in URL.");
      setIsLoading(false);
      return;
    }

    const fetchTeamData = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const data = await getTeamDetailsById(teamId);
        // Check the structure of the returned data based on your api.js and server response
        // Assuming the API returns { success: true, data: { id, name, description, members: [...] } }
        // or just the team object directly if your interceptor handles it.
        if (data && (data.success === undefined || data.success === true)) {
          // Adjust access based on actual response structure
          setTeamDetails(data.data || data);
        } else {
          throw new Error(data.error || "Failed to fetch team details");
        }
      } catch (err) {
        console.error("Failed to load team details:", err);
        setError(err.message || "An unexpected error occurred.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchTeamData();
  }, [teamId]); // Refetch if teamId changes

  if (isLoading) {
    return <LoadingSpinner />;
  }

  if (error) {
    return <ErrorDisplay message={error} />;
  }

  if (!teamDetails) {
    return <div>Team not found or unable to load details.</div>;
  }

  // Render the team details
  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">
        Team Details: {teamDetails.name}
      </h1>
      <p className="mb-4">
        {teamDetails.description || "No description available."}
      </p>

      <h2 className="text-xl font-semibold mb-2">Members</h2>
      {teamDetails.members && teamDetails.members.length > 0 ? (
        <ul className="list-disc pl-5">
          {teamDetails.members.map((member) => (
            <li key={member.userId} className="mb-1">
              {member.name} ({member.role || "Member"}) - ID: {member.userId}
            </li>
          ))}
        </ul>
      ) : (
        <p>No members found for this team.</p>
      )}

      {/* Add buttons/forms for other actions later (e.g., Invite Member, Edit Team) */}
    </div>
  );
};

export default TeamDetailsPage;
