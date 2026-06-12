// components/PermissionGroup.jsx
import React, { useState } from 'react';
import { PERMISSIONS, PERMISSION_CONFIG, PERMISSION_CATEGORIES, getChildPermissions, hasChildren, getParentPermission } from '../constants/permissions';

const PermissionGroup = ({ permissions, orgId, onPermissionChange }) => {
    const [isExpanded, setIsExpanded] = useState(false);
    const currentPerms = permissions.find(p => p.organizationId === orgId) || {};

    const handlePermissionToggle = (permKey, checked) => {
        // Update the main permission
        onPermissionChange(orgId, permKey, checked);

        // If this permission has children AND it's being checked, auto-check children
        if (checked && hasChildren(permKey)) {
            const children = getChildPermissions(permKey);
            children.forEach(child => {
                if (!currentPerms[child]) {
                    onPermissionChange(orgId, child, true);
                }
            });
        }

        // If this permission is being unchecked, check if it's a child and handle parent
        if (!checked) {
            const parent = getParentPermission(permKey);
            if (parent && currentPerms[parent] === true) {
                // Uncheck the parent if this child is being unchecked
                onPermissionChange(orgId, parent, false);
            }
        }
    };

    // Check if a permission is auto-enabled because its parent is checked
    const isAutoEnabled = (permKey) => {
        const parent = getParentPermission(permKey);
        if (parent && currentPerms[parent] === true) {
            return true;
        }
        return false;
    };

    // Check if a permission is a parent that has children
    const isParentPermission = (permKey) => {
        return hasChildren(permKey);
    };

    // Count how many permissions are enabled for this organization
    const enabledCount = Object.values(PERMISSIONS).filter(perm => currentPerms[perm] === true).length;
    const totalPermissions = Object.values(PERMISSIONS).length;

    return (
        <details className="bg-slate-50 rounded-xl border border-slate-200 group" open={isExpanded}>
            <summary
                onClick={(e) => {
                    e.preventDefault();
                    setIsExpanded(!isExpanded);
                }}
                className="flex items-center justify-between p-3 cursor-pointer hover:bg-slate-100 rounded-xl"
            >
                <div className="flex items-center space-x-2">
                    <i className={`pi pi-chevron-right text-xs text-slate-400 transition-transform ${isExpanded ? 'rotate-90' : ''}`}></i>
                    <span className="text-sm font-medium text-slate-700">
                        {currentPerms.organizationName || 'Organization'}
                    </span>
                </div>
                <div className="flex items-center gap-2">
                    {enabledCount > 0 && (
                        <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full">
                            {enabledCount} / {totalPermissions}
                        </span>
                    )}
                </div>
            </summary>

            <div className="p-3 border-t border-slate-200">
                {Object.entries(PERMISSION_CATEGORIES).map(([category, permKeys]) => (
                    <div key={category} className="mb-4 last:mb-0">
                        <p className="text-xs font-semibold text-slate-500 mb-2 pb-1 border-b border-slate-200">
                            {category}
                        </p>
                        <div className="grid grid-cols-1 gap-2">
                            {permKeys.map(permKey => {
                                const config = PERMISSION_CONFIG[permKey];
                                const isChecked = currentPerms[permKey] === true;
                                const autoEnabled = isAutoEnabled(permKey);
                                const isDisabled = autoEnabled;
                                const isParent = isParentPermission(permKey);
                                const children = getChildPermissions(permKey);

                                return (
                                    <div
                                        key={permKey}
                                        className={`rounded-lg transition-colors ${isChecked ? 'bg-red-50 border border-red-200' : 'border border-transparent'}`}
                                    >
                                        <label className={`flex items-center gap-3 p-2 rounded-lg ${!isDisabled ? 'cursor-pointer hover:bg-slate-100' : 'cursor-not-allowed'}`}>
                                            <input
                                                type="checkbox"
                                                checked={isChecked}
                                                disabled={isDisabled}
                                                onChange={(e) => handlePermissionToggle(permKey, e.target.checked)}
                                                className={`w-4 h-4 rounded focus:ring-red-500 ${isDisabled ? 'opacity-50 cursor-not-allowed' : 'text-red-600'}`}
                                            />
                                            <i className={`${config.icon} text-sm ${isChecked ? 'text-red-600' : 'text-slate-500'}`}></i>
                                            <div className="flex-1">
                                                <div className="flex items-center gap-2 flex-wrap">
                                                    <span className={`text-sm ${isChecked ? 'text-red-700 font-medium' : 'text-slate-700'}`}>
                                                        {config.label}
                                                    </span>
                                                    {autoEnabled && (
                                                        <span className="text-[10px] bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full">
                                                            Auto (from Generate Cards)
                                                        </span>
                                                    )}
                                                    {isParent && isChecked && (
                                                        <span className="text-[10px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-full">
                                                            Includes: {children.map(c => {
                                                                const childConfig = PERMISSION_CONFIG[c];
                                                                return childConfig?.label?.split(' ')[0] || c;
                                                            }).join(', ')}
                                                        </span>
                                                    )}
                                                </div>
                                                <p className="text-xs text-slate-500">{config.description}</p>
                                            </div>
                                        </label>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                ))}

                {/* Info Note */}
                <div className="mt-3 pt-3 border-t border-slate-200">
                    <p className="text-xs text-slate-400 flex items-center gap-1">
                        <i className="pi pi-info-circle"></i>
                        <span>"Generate ID Cards" automatically includes all permissions needed for card generation (Student Management, Photo Upload, Bulk Import, Templates).</span>
                    </p>
                </div>
            </div>
        </details>
    );
};

export default PermissionGroup;