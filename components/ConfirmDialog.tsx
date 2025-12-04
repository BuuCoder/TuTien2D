'use client';

import React from 'react';

interface ConfirmDialogProps {
    isOpen: boolean;
    title: string;
    message: string;
    details?: string[];
    confirmText?: string;
    cancelText?: string;
    confirmColor?: string;
    onConfirm: () => void;
    onCancel: () => void;
}

export default function ConfirmDialog({
    isOpen,
    title,
    message,
    details,
    confirmText = 'Xác nhận',
    cancelText = 'Hủy',
    confirmColor = '#10B981',
    onConfirm,
    onCancel
}: ConfirmDialogProps) {
    if (!isOpen) return null;

    return (
        <div
            style={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundColor: 'rgba(0, 0, 0, 0.7)',
                backdropFilter: 'blur(4px)',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                zIndex: 10003,
                animation: 'fadeIn 0.2s ease-out',
                padding: '20px'
            }}
            onClick={onCancel}
        >
            <style>{`
                @keyframes fadeIn {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }
                @keyframes slideUp {
                    from { 
                        opacity: 0;
                        transform: translateY(20px) scale(0.95);
                    }
                    to { 
                        opacity: 1;
                        transform: translateY(0) scale(1);
                    }
                }
                
                /* Mobile responsive */
                @media (max-width: 480px) {
                    .confirm-dialog-container {
                        padding: 16px !important;
                        max-width: 95% !important;
                    }
                    .confirm-dialog-icon {
                        width: 48px !important;
                        height: 48px !important;
                        font-size: 24px !important;
                        margin-bottom: 12px !important;
                    }
                    .confirm-dialog-title {
                        font-size: 18px !important;
                        margin-bottom: 10px !important;
                    }
                    .confirm-dialog-message {
                        font-size: 14px !important;
                        margin-bottom: 12px !important;
                    }
                    .confirm-dialog-details {
                        padding: 10px !important;
                        margin-bottom: 16px !important;
                        font-size: 12px !important;
                    }
                    .confirm-dialog-buttons {
                        gap: 8px !important;
                        margin-top: 16px !important;
                    }
                    .confirm-dialog-button {
                        padding: 10px !important;
                        font-size: 14px !important;
                    }
                }
                
                /* Very small screens */
                @media (max-width: 360px) {
                    .confirm-dialog-container {
                        padding: 12px !important;
                    }
                    .confirm-dialog-icon {
                        width: 40px !important;
                        height: 40px !important;
                        font-size: 20px !important;
                    }
                    .confirm-dialog-title {
                        font-size: 16px !important;
                    }
                    .confirm-dialog-message {
                        font-size: 13px !important;
                    }
                    .confirm-dialog-details {
                        font-size: 11px !important;
                    }
                    .confirm-dialog-button {
                        padding: 8px !important;
                        font-size: 13px !important;
                    }
                }
                
                /* Landscape orientation - compact vertical space */
                @media (max-height: 500px) and (orientation: landscape) {
                    .confirm-dialog-container {
                        padding: 12px !important;
                        max-width: 500px !important;
                        max-height: 90vh !important;
                        overflow-y: auto !important;
                    }
                    .confirm-dialog-icon {
                        width: 40px !important;
                        height: 40px !important;
                        font-size: 20px !important;
                        margin-bottom: 8px !important;
                    }
                    .confirm-dialog-title {
                        font-size: 16px !important;
                        margin-bottom: 8px !important;
                    }
                    .confirm-dialog-message {
                        font-size: 13px !important;
                        margin-bottom: 10px !important;
                        line-height: 1.4 !important;
                    }
                    .confirm-dialog-details {
                        padding: 8px !important;
                        margin-bottom: 12px !important;
                        font-size: 11px !important;
                    }
                    .confirm-dialog-details > div {
                        margin-bottom: 4px !important;
                    }
                    .confirm-dialog-buttons {
                        gap: 8px !important;
                        margin-top: 12px !important;
                    }
                    .confirm-dialog-button {
                        padding: 8px 12px !important;
                        font-size: 13px !important;
                    }
                }
                
                /* Very short landscape */
                @media (max-height: 400px) and (orientation: landscape) {
                    .confirm-dialog-container {
                        padding: 10px !important;
                        max-height: 95vh !important;
                    }
                    .confirm-dialog-icon {
                        width: 32px !important;
                        height: 32px !important;
                        font-size: 16px !important;
                        margin-bottom: 6px !important;
                    }
                    .confirm-dialog-title {
                        font-size: 14px !important;
                        margin-bottom: 6px !important;
                    }
                    .confirm-dialog-message {
                        font-size: 12px !important;
                        margin-bottom: 8px !important;
                    }
                    .confirm-dialog-details {
                        padding: 6px !important;
                        margin-bottom: 10px !important;
                        font-size: 10px !important;
                    }
                    .confirm-dialog-details > div {
                        margin-bottom: 3px !important;
                    }
                    .confirm-dialog-buttons {
                        margin-top: 10px !important;
                    }
                    .confirm-dialog-button {
                        padding: 6px 10px !important;
                        font-size: 12px !important;
                    }
                }
            `}</style>
            
            <div
                className="confirm-dialog-container"
                style={{
                    backgroundColor: '#1F2937',
                    borderRadius: '16px',
                    padding: '24px',
                    maxWidth: '400px',
                    width: '100%',
                    boxShadow: '0 20px 60px rgba(0, 0, 0, 0.5)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    animation: 'slideUp 0.3s ease-out'
                }}
                onClick={(e) => e.stopPropagation()}
            >
                {/* Icon */}
                <div 
                    className="confirm-dialog-icon"
                    style={{
                        width: '56px',
                        height: '56px',
                        borderRadius: '50%',
                        backgroundColor: 'rgba(59, 130, 246, 0.15)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        margin: '0 auto 16px',
                        fontSize: '28px'
                    }}
                >
                    ❓
                </div>

                {/* Title */}
                <h3 
                    className="confirm-dialog-title"
                    style={{
                        color: '#F9FAFB',
                        fontSize: '20px',
                        fontWeight: 'bold',
                        textAlign: 'center',
                        margin: '0 0 12px 0',
                        letterSpacing: '-0.02em'
                    }}
                >
                    {title}
                </h3>

                {/* Message */}
                <p 
                    className="confirm-dialog-message"
                    style={{
                        color: '#D1D5DB',
                        fontSize: '15px',
                        textAlign: 'center',
                        margin: '0 0 16px 0',
                        lineHeight: '1.6'
                    }}
                >
                    {message}
                </p>

                {/* Details */}
                {details && details.length > 0 && (
                    <div 
                        className="confirm-dialog-details"
                        style={{
                            backgroundColor: 'rgba(0, 0, 0, 0.3)',
                            borderRadius: '8px',
                            padding: '12px',
                            marginBottom: '20px'
                        }}
                    >
                        {details.map((detail, index) => (
                            <div
                                key={index}
                                style={{
                                    color: '#9CA3AF',
                                    fontSize: '13px',
                                    marginBottom: index < details.length - 1 ? '6px' : '0',
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center'
                                }}
                            >
                                {detail}
                            </div>
                        ))}
                    </div>
                )}

                {/* Buttons */}
                <div 
                    className="confirm-dialog-buttons"
                    style={{
                        display: 'flex',
                        gap: '12px',
                        marginTop: '20px'
                    }}
                >
                    <button
                        className="confirm-dialog-button"
                        onClick={onCancel}
                        style={{
                            flex: 1,
                            padding: '12px',
                            backgroundColor: 'rgba(107, 114, 128, 0.2)',
                            color: '#D1D5DB',
                            border: '1px solid rgba(107, 114, 128, 0.3)',
                            borderRadius: '8px',
                            fontSize: '15px',
                            fontWeight: '600',
                            cursor: 'pointer',
                            transition: 'all 0.2s',
                            letterSpacing: '-0.01em'
                        }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor = 'rgba(107, 114, 128, 0.3)';
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = 'rgba(107, 114, 128, 0.2)';
                        }}
                    >
                        {cancelText}
                    </button>
                    
                    <button
                        className="confirm-dialog-button"
                        onClick={onConfirm}
                        style={{
                            flex: 1,
                            padding: '12px',
                            backgroundColor: confirmColor,
                            color: '#FFFFFF',
                            border: 'none',
                            borderRadius: '8px',
                            fontSize: '15px',
                            fontWeight: '600',
                            cursor: 'pointer',
                            transition: 'all 0.2s',
                            letterSpacing: '-0.01em',
                            boxShadow: `0 4px 12px ${confirmColor}40`
                        }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.transform = 'translateY(-1px)';
                            e.currentTarget.style.boxShadow = `0 6px 16px ${confirmColor}60`;
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.transform = 'translateY(0)';
                            e.currentTarget.style.boxShadow = `0 4px 12px ${confirmColor}40`;
                        }}
                    >
                        {confirmText}
                    </button>
                </div>
            </div>
        </div>
    );
}
