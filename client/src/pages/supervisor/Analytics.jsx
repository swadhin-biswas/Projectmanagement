import { faChartLine } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import React from "react";
import SupervisorAnalytics from "../../components/supervisor/SupervisorAnalytics";

const SupervisorAnalyticsPage = () => {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-purple-800 dark:text-white flex items-center gap-2">
          <FontAwesomeIcon icon={faChartLine} className="text-purple-600" />
          Advanced Analytics
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mt-2">
          Visualize data about your students, teams, and projects for better
          insights
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-3">
          <SupervisorAnalytics />
        </div>
      </div>
    </div>
  );
};

export default SupervisorAnalyticsPage;
