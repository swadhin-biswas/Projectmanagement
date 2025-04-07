import {
  faChartLine,
  faFileExport,
  faFilePdf,
} from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import React from "react";
import ReportGenerator from "../../components/supervisor/ReportGenerator";

const SupervisorReports = () => {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-purple-800 dark:text-white flex items-center gap-2">
          <FontAwesomeIcon icon={faFileExport} className="text-purple-600" />
          Reports & Analytics
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mt-2">
          Generate reports and analytics about your teams, students, and
          projects
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          <ReportGenerator />
        </div>

        <div className="space-y-6">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-2 mb-4">
              <FontAwesomeIcon icon={faChartLine} className="text-blue-500" />
              Analytics Dashboard
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              View analytics and insights about your student performance and
              project progress.
            </p>
            <button className="w-full bg-blue-500 hover:bg-blue-600 text-white py-2 px-4 rounded-md transition-colors">
              Open Analytics Dashboard
            </button>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-2 mb-4">
              <FontAwesomeIcon icon={faFilePdf} className="text-indigo-500" />
              Scheduled Reports
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              Set up automatic scheduled reports to be delivered to your email
              on a regular basis.
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Coming soon...
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SupervisorReports;
