import React, { useContext, useEffect, useState } from "react";
import { AuthContext } from "../../context/AuthContext";
import { studentService } from "../../services/api";

const TeamManagement = () => {
  const { user } = useContext(AuthContext);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [teams, setTeams] = useState([]);
  const [teamData, setTeamData] = useState({
    name: "",
    teamId: "",
    members: [],
  });
  const [inviteData, setInviteData] = useState({
    email: "",
    teamId: "",
  });
  const [joinTeamId, setJoinTeamId] = useState("");
  const [hasTeam, setHasTeam] = useState(false);
  const [currentTeam, setCurrentTeam] = useState(null);

  // Check if the student has a team already
  useEffect(() => {
    if (user?.studentId) {
      fetchTeamData();
    }
  }, [user]);

  const fetchTeamData = async () => {
    try {
      setLoading(true);
      // This is a mock call since we don't have a direct endpoint to get a student's team
      // In a real app, you'd have a specific endpoint for this
      const response = await studentService.getMessages(); // Using this as a proxy to check auth

      // For demo purposes, we're setting hasTeam to false by default
      // In a real app, this would come from the backend
      setHasTeam(false); // This would be determined by your API
      setCurrentTeam(null); // This would come from your API
      setLoading(false);
    } catch (error) {
      console.error("Error fetching team data:", error);
      setError("Failed to load team data");
      setLoading(false);
    }
  };

  const handleCreateTeam = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");

    try {
      const response = await studentService.createTeam(teamData);
      setSuccess("Team created successfully!");
      setHasTeam(true);
      setCurrentTeam(response); // Assuming response contains team details
      setTeamData({ name: "", teamId: "", members: [] });
    } catch (error) {
      setError(error.response?.data?.message || "Failed to create team");
    } finally {
      setLoading(false);
    }
  };

  const handleJoinTeam = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");

    try {
      const response = await studentService.joinTeam({ teamId: joinTeamId });
      setSuccess("Successfully joined team!");
      setHasTeam(true);
      setCurrentTeam(response); // Assuming response contains team details
      setJoinTeamId("");
    } catch (error) {
      setError(error.response?.data?.message || "Failed to join team");
    } finally {
      setLoading(false);
    }
  };

  const handleInviteToTeam = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");

    try {
      await studentService.inviteToTeam(inviteData);
      setSuccess("Invitation sent successfully!");
      setInviteData({ email: "", teamId: "" });
    } catch (error) {
      setError(error.response?.data?.message || "Failed to send invitation");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h2 className="text-2xl font-semibold mb-6">Team Management</h2>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}
      {success && (
        <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4">
          {success}
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-8">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
        </div>
      ) : hasTeam ? (
        <div>
          <div className="bg-blue-50 p-6 rounded-lg mb-6">
            <h3 className="text-xl font-semibold mb-3">
              {currentTeam?.name || "Your Team"}
            </h3>
            <p>
              <strong>Team ID:</strong> {currentTeam?.teamId || "N/A"}
            </p>
            <p className="mt-2">
              <strong>Team Leader:</strong>{" "}
              {user?.isTeamLeader ? "You" : "Someone else"}
            </p>

            <div className="mt-4">
              <h4 className="font-medium mb-2">Team Members:</h4>
              {currentTeam?.members?.length > 0 ? (
                <ul className="list-disc list-inside">
                  {currentTeam.members.map((member, index) => (
                    <li key={index}>{member.fullName || "Unknown Member"}</li>
                  ))}
                </ul>
              ) : (
                <p className="text-gray-500">No other members yet</p>
              )}
            </div>

            {user?.isTeamLeader && (
              <div className="mt-6">
                <h4 className="font-medium mb-2">Invite a Student:</h4>
                <form
                  onSubmit={handleInviteToTeam}
                  className="flex items-end gap-4"
                >
                  <div className="flex-1">
                    <label
                      className="block text-gray-700 text-sm font-bold mb-2"
                      htmlFor="inviteEmail"
                    >
                      Student Email
                    </label>
                    <input
                      type="email"
                      id="inviteEmail"
                      value={inviteData.email}
                      onChange={(e) =>
                        setInviteData({
                          ...inviteData,
                          email: e.target.value,
                          teamId: currentTeam?.teamId,
                        })
                      }
                      className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                      required
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={loading}
                    className="bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
                  >
                    Send Invite
                  </button>
                </form>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 gap-8">
          <div>
            <h3 className="text-xl font-semibold mb-4">Create a Team</h3>
            <form onSubmit={handleCreateTeam}>
              <div className="mb-4">
                <label
                  className="block text-gray-700 text-sm font-bold mb-2"
                  htmlFor="teamName"
                >
                  Team Name
                </label>
                <input
                  type="text"
                  id="teamName"
                  value={teamData.name}
                  onChange={(e) =>
                    setTeamData({ ...teamData, name: e.target.value })
                  }
                  className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                  required
                />
              </div>

              <div className="mb-4">
                <label
                  className="block text-gray-700 text-sm font-bold mb-2"
                  htmlFor="teamId"
                >
                  Team ID (Unique Identifier)
                </label>
                <input
                  type="text"
                  id="teamId"
                  value={teamData.teamId}
                  onChange={(e) =>
                    setTeamData({ ...teamData, teamId: e.target.value })
                  }
                  className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                  required
                />
              </div>

              <div>
                <button
                  type="submit"
                  disabled={loading}
                  className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
                >
                  Create Team
                </button>
              </div>
            </form>
          </div>

          <div>
            <h3 className="text-xl font-semibold mb-4">Join Existing Team</h3>
            <form onSubmit={handleJoinTeam}>
              <div className="mb-4">
                <label
                  className="block text-gray-700 text-sm font-bold mb-2"
                  htmlFor="joinTeamId"
                >
                  Team ID
                </label>
                <input
                  type="text"
                  id="joinTeamId"
                  value={joinTeamId}
                  onChange={(e) => setJoinTeamId(e.target.value)}
                  className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                  placeholder="Enter team ID to join"
                  required
                />
              </div>

              <div>
                <button
                  type="submit"
                  disabled={loading}
                  className="bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
                >
                  Join Team
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default TeamManagement;
