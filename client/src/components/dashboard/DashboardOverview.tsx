import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { motion } from 'framer-motion';
import { QuickActions } from './QuickActions';
import { VelocityChart } from './VelocityChart';
import { WorkloadView } from './WorkloadView';

interface DashboardOverviewProps {
    boardId: string | undefined;
}

export const DashboardOverview: React.FC<DashboardOverviewProps> = ({ boardId }) => {
    const { user } = useAuth();
    const currentDate = new Date().toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });

    return (
        <div className="flex-1 h-full flex flex-col p-8 overflow-y-auto">
            {/* Header Section */}
            <div className="mb-8">
                <motion.h1
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-3xl font-bold bg-gradient-to-r from-white to-white/70 bg-clip-text text-transparent"
                >
                    Welcome back, {user?.displayName?.split(' ')[0] || 'User'}
                </motion.h1>
                <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.1 }}
                    className="text-zinc-400 mt-1"
                >
                    {currentDate} • Board {boardId || 'N/A'}
                </motion.p>
            </div>

            {/* Main Grid Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1">

                {/* Left Column: Quick Actions & Velocity (2/3 width) */}
                <div className="lg:col-span-2 flex flex-col gap-6">

                    {/* Quick Actions */}
                    <QuickActions />

                    {/* Velocity Chart */}
                    <VelocityChart />
                </div>

                {/* Right Column: Workload / Capacity (1/3 width) */}
                <div className="flex flex-col gap-6">
                    {/* Workload View */}
                    <WorkloadView />
                </div>

            </div>
        </div>
    );
};
