import React, { useState, useEffect } from 'react';
import './OrderTracking.css';

const STEPS = [
    { status: 'ordered', label: 'Ordered', icon: '📝' },
    { status: 'processing', label: 'Processing', icon: '⚙️' },
    { status: 'packing', label: 'Packing', icon: '📦' },
    { status: 'shipped', label: 'Shipped', icon: '🚚' },
    { status: 'in_transit', label: 'In Transit', icon: '📍' },
    { status: 'out_for_delivery', label: 'Out for Delivery', icon: '🚗' },
    { status: 'delivered', label: 'Delivered', icon: '🏠' },
];

export default function OrderTracking({ currentStatus, history = [] }) {
    const [showDetails, setShowDetails] = useState(false);
    const [animateIn, setAnimateIn] = useState(false);

    useEffect(() => {
        setAnimateIn(true);
    }, [currentStatus]);

    const getStepState = (stepStatus) => {
        const statusOrder = STEPS.map(s => s.status);
        const currentIndex = statusOrder.indexOf(currentStatus?.toLowerCase());
        const stepIndex = statusOrder.indexOf(stepStatus);

        if (stepIndex < currentIndex) return 'completed';
        if (stepIndex === currentIndex) return 'current';
        return 'pending';
    };

    const currentIndex = STEPS.findIndex(s => s.status === currentStatus?.toLowerCase());
    const progress = currentIndex !== -1 ? (currentIndex / (STEPS.length - 1)) * 100 : 0;

    return (
        <div className={`order-tracking-container ${animateIn ? 'animate-in' : ''}`}>
            {/* Horizontal Timeline */}
            <div className="tracking-timeline-horizontal">
                <div className="progress-bar-bg">
                    <div
                        className="progress-bar-fill"
                        style={{ width: `${progress}%` }}
                    ></div>
                </div>
                {STEPS.map((step, index) => {
                    const state = getStepState(step.status);
                    return (
                        <div key={index} className={`timeline-step ${state}`}>
                            <div className="step-icon-container">
                                {state === 'completed' ? '✓' : step.icon}
                            </div>
                            <div className="step-label">{step.label}</div>
                        </div>
                    );
                })}
            </div>

            <div className="view-details-action">
                <button 
                    className="view-details-btn" 
                    onClick={() => setShowDetails(true)}
                >
                    View Details →
                </button>
            </div>

            {/* Details Modal */}
            {showDetails && (
                <div 
                    className="tracking-modal-overlay" 
                    onClick={() => setShowDetails(false)}
                >
                    <div 
                        className="tracking-modal-content" 
                        onClick={e => e.stopPropagation()}
                    >
                        <div className="modal-header">
                            <h3>Tracking Details</h3>
                            <button 
                                className="close-btn" 
                                onClick={() => setShowDetails(false)}
                            >
                                ×
                            </button>
                        </div>
                        <div className="modal-body">
                            <div className="tracking-timeline-vertical">
                                {STEPS.map((step, index) => {
                                    const state = getStepState(step.status);
                                    return (
                                        <div key={index} className={`vertical-step ${state}`}>
                                            <div className="vertical-line"></div>
                                            <div className="vertical-icon">
                                                {state === 'completed' ? '✓' : step.icon}
                                            </div>
                                            <div className="vertical-info">
                                                <div className="step-title">{step.label}</div>
                                                <div className="step-desc">
                                                    {state === 'completed' ? 'Completed' :
                                                        state === 'current' ? 'In Progress' : 'Pending'}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
