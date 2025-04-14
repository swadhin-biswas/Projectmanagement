import PageTransition from "@/components/PageTransition";
import DeadlinesPanel from "@/components/student/DeadlinesPanel";
import ReportSubmissionForm from "@/components/student/ReportSubmissionForm";
import React from "react";
import { Helmet } from "react-helmet-async";

const DeadlinesPage = () => {
  return (
    <PageTransition>
      <Helmet>
        <title>Deadlines | Student Portal</title>
      </Helmet>
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-8">Deadlines & Submissions</h1>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <DeadlinesPanel />
          <ReportSubmissionForm />
        </div>
      </div>
    </PageTransition>
  );
};

export default DeadlinesPage;
