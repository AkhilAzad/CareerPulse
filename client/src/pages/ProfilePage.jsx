import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  User,
  Mail,
  Phone,
  MapPin,
  Briefcase,
  GraduationCap,
  Award,
  FolderGit2,
  Link as LinkIcon,
  FileText,
  Upload,
  Download,
  Trash2,
  Plus,
  Check,
  AlertCircle,
  ExternalLink,
  Calendar,
  Building2,
  Globe,
  Save,
  RefreshCw,
  X,
  CheckCircle2,
  Sparkles,
  ShieldCheck,
  Edit2,
  Eye,
  ArrowLeft,
  Target,
  IndianRupee,
  Camera,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import {
  fetchUserProfile,
  updateUserProfile,
  uploadResumeMetadata,
  uploadResumeFile,
  downloadUserResume,
  deleteUserResume,
  uploadUserAvatar,
  deleteUserAvatar,
  resolveAvatarUrl,
} from '../services/userService';
import { INDIAN_CITIES, INDIAN_DEGREES, getUserInitials } from '../utils/jobFormatters';
import AvatarCropModal from '../components/AvatarCropModal';

const POPULAR_SKILL_SUGGESTIONS = [
  'React',
  'TypeScript',
  'JavaScript',
  'Node.js',
  'Python',
  'Next.js',
  'Tailwind CSS',
  'GraphQL',
  'REST APIs',
  'MongoDB',
  'PostgreSQL',
  'Docker',
  'AWS',
  'Git',
  'CI/CD',
  'Jest',
  'UI/UX Design',
  'Figma',
];

const COMPANY_SIZES = [
  '1-10 employees',
  '11-50 employees',
  '51-200 employees',
  '201-500 employees',
  '501-1000 employees',
  '1000+ employees',
];

const POPULAR_ROLE_SUGGESTIONS = [
  'Full Stack Developer',
  'Frontend Engineer',
  'Backend Developer',
  'DevOps / Cloud Engineer',
  'Software Engineer',
  'Data Scientist',
  'Mobile Developer',
  'QA Automation Engineer',
];

const POPULAR_INDIAN_HUBS = [
  'Bengaluru, Karnataka',
  'Hyderabad, Telangana',
  'Pune, Maharashtra',
  'Mumbai, Maharashtra',
  'Delhi NCR',
  'Chennai, Tamil Nadu',
];

const WORKPLACE_OPTIONS = [
  { id: 'any', label: 'Open to All', desc: 'Flexible with Remote, Hybrid, or On-site roles' },
  { id: 'remote', label: 'Remote', desc: 'Work from home or anywhere in India' },
  { id: 'hybrid', label: 'Hybrid', desc: 'Balanced combination of office & remote days' },
  { id: 'on-site', label: 'On-site', desc: 'Full-time at employer office location' },
];

const EMPLOYMENT_TYPE_CHOICES = ['Full-time', 'Internship', 'Contract', 'Part-time'];

export default function ProfilePage() {
  const { user: authUser, updateUser } = useAuth();
  const navigate = useNavigate();

  // Profile data state
  const [profileData, setProfileData] = useState(null);
  const [initialData, setInitialData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  // Active navigation tab
  const [activeTab, setActiveTab] = useState('personal');

  // Input states for item sub-forms
  const [newSkillInput, setNewSkillInput] = useState('');
  const [newRoleInput, setNewRoleInput] = useState('');
  const [newCityInput, setNewCityInput] = useState('');
  const [isDownloadingResume, setIsDownloadingResume] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState(null);
  const [avatarLoadError, setAvatarLoadError] = useState(false);
  const avatarFileInputRef = useRef(null);

  // Avatar Cropper Modal State
  const [isCropModalOpen, setIsCropModalOpen] = useState(false);
  const [selectedCropImage, setSelectedCropImage] = useState(null);

  // Reset avatar load error whenever preview or persisted avatar URL updates
  useEffect(() => {
    setAvatarLoadError(false);
  }, [avatarPreview, profileData?.profile?.avatarUrl]);

  // Modals for sub-items
  const [modalType, setModalType] = useState(null); // 'education' | 'experience' | 'project' | 'certification' | null
  const [editingItemIndex, setEditingItemIndex] = useState(null); // index or null for adding new
  const [modalFormData, setModalFormData] = useState({});

  // Fetch full profile from API on mount
  const loadProfile = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage('');
    try {
      const response = await fetchUserProfile();
      if (response && response.data) {
        const data = response.data;
        // Normalize nested structure
        const normalized = {
          name: data.name || '',
          email: data.email || '',
          role: data.role || 'candidate',
          completeness: data.completeness || 0,
          profile: {
            headline: data.profile?.headline || '',
            bio: data.profile?.bio || '',
            phone: data.profile?.phone || '',
            location: data.profile?.location || '',
            avatarUrl: data.profile?.avatarUrl || '',
            website: data.profile?.website || '',
            portfolio: data.profile?.portfolio || '',
            github: data.profile?.github || '',
            linkedin: data.profile?.linkedin || '',
            twitter: data.profile?.twitter || '',
            company: data.profile?.company || '',
            companyWebsite: data.profile?.companyWebsite || '',
            companyDescription: data.profile?.companyDescription || '',
            industry: data.profile?.industry || '',
            companySize: data.profile?.companySize || '',
            companyLogo: data.profile?.companyLogo || '',
            headquarters: data.profile?.headquarters || '',
            companyRegistration: data.profile?.companyRegistration || '',
            verificationStatus: data.profile?.verificationStatus || 'unverified',
          },
          skills: Array.isArray(data.skills) ? data.skills : [],
          education: Array.isArray(data.education) ? data.education : [],
          experience: Array.isArray(data.experience) ? data.experience : [],
          projects: Array.isArray(data.projects) ? data.projects : [],
          certifications: Array.isArray(data.certifications) ? data.certifications : [],
          resume: data.resume || null,
          jobPreferences: {
            desiredRoles: Array.isArray(data.jobPreferences?.desiredRoles)
              ? data.jobPreferences.desiredRoles
              : [],
            preferredCities: Array.isArray(data.jobPreferences?.preferredCities)
              ? data.jobPreferences.preferredCities
              : [],
            workplaceType: data.jobPreferences?.workplaceType || 'any',
            expectedSalary: {
              min: data.jobPreferences?.expectedSalary?.min !== undefined && data.jobPreferences?.expectedSalary?.min !== null
                ? data.jobPreferences.expectedSalary.min
                : '',
              max: data.jobPreferences?.expectedSalary?.max !== undefined && data.jobPreferences?.expectedSalary?.max !== null
                ? data.jobPreferences.expectedSalary.max
                : '',
              currency: data.jobPreferences?.expectedSalary?.currency || 'INR',
            },
            employmentTypes: Array.isArray(data.jobPreferences?.employmentTypes)
              ? data.jobPreferences.employmentTypes
              : ['Full-time'],
          },
        };
        setProfileData(normalized);
        setInitialData(JSON.parse(JSON.stringify(normalized)));
      }
    } catch (err) {
      setErrorMessage(err.message || 'Failed to load profile. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  // Check if there are unsaved changes
  const hasUnsavedChanges = useMemo(() => {
    if (!profileData || !initialData) return false;
    return JSON.stringify(profileData) !== JSON.stringify(initialData);
  }, [profileData, initialData]);

  // Warn user when attempting to leave with unsaved changes
  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasUnsavedChanges]);

  // Clean up temporary object URLs on unmount
  useEffect(() => {
    return () => {
      if (selectedCropImage && selectedCropImage.startsWith('blob:')) {
        URL.revokeObjectURL(selectedCropImage);
      }
      if (avatarPreview && avatarPreview.startsWith('blob:')) {
        URL.revokeObjectURL(avatarPreview);
      }
    };
  }, [selectedCropImage, avatarPreview]);

  // Handle General Top-Level and Profile Nested Changes
  const handleFieldChange = (field, value) => {
    setProfileData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleProfileFieldChange = (field, value) => {
    setProfileData((prev) => ({
      ...prev,
      profile: {
        ...prev.profile,
        [field]: value,
      },
    }));
  };

  // ---------------- Skills Management ----------------
  const handleAddSkill = (skillToAdd) => {
    const trimmed = (skillToAdd || newSkillInput).trim().toLowerCase();
    if (!trimmed) return;
    if (profileData.skills.includes(trimmed)) {
      setNewSkillInput('');
      return;
    }
    setProfileData((prev) => ({
      ...prev,
      skills: [...prev.skills, trimmed],
    }));
    setNewSkillInput('');
  };

  const handleRemoveSkill = (skillToRemove) => {
    setProfileData((prev) => ({
      ...prev,
      skills: prev.skills.filter((s) => s !== skillToRemove),
    }));
  };

  // ---------------- Sub-Item Modals (Education, Experience, Project, Certification) ----------------
  const openModal = (type, item = null, index = null) => {
    setModalType(type);
    setEditingItemIndex(index);
    if (item) {
      const yearFromDate = (d) => {
        if (!d) return '';
        try {
          return new Date(d).getFullYear().toString();
        } catch (_) {
          return '';
        }
      };
      setModalFormData({
        ...item,
        startYear: item.startYear || yearFromDate(item.startDate),
        endYear: item.endYear || yearFromDate(item.endDate),
      });
    } else {
      // Default empty structure
      if (type === 'education') {
        setModalFormData({
          institution: '',
          degree: '',
          fieldOfStudy: '',
          startYear: '',
          endYear: '',
          startDate: '',
          endDate: '',
          current: false,
          description: '',
        });
      } else if (type === 'experience') {
        setModalFormData({
          company: '',
          title: '',
          location: '',
          startDate: '',
          endDate: '',
          current: false,
          description: '',
        });
      } else if (type === 'project') {
        setModalFormData({
          title: '',
          description: '',
          link: '',
          technologies: '',
          startDate: '',
          endDate: '',
        });
      } else if (type === 'certification') {
        setModalFormData({
          name: '',
          issuingOrganization: '',
          issueDate: '',
          expiryDate: '',
          credentialId: '',
          credentialUrl: '',
        });
      }
    }
  };

  const closeModal = () => {
    setModalType(null);
    setEditingItemIndex(null);
    setModalFormData({});
  };

  const handleSaveModalItem = (e) => {
    e.preventDefault();
    if (!modalType) return;

    if (modalType === 'education') {
      if (!modalFormData.institution?.trim()) return;
      const updatedList = [...profileData.education];
      const startYearVal = modalFormData.startYear?.toString().trim() || '';
      const endYearVal = modalFormData.current ? '' : (modalFormData.endYear?.toString().trim() || '');

      const entry = {
        institution: modalFormData.institution.trim(),
        degree: modalFormData.degree?.trim() || '',
        fieldOfStudy: modalFormData.fieldOfStudy?.trim() || '',
        startYear: startYearVal,
        endYear: endYearVal,
        startDate: modalFormData.startDate || (startYearVal ? new Date(`${startYearVal}-01-01`) : undefined),
        endDate: modalFormData.current ? undefined : (modalFormData.endDate || (endYearVal ? new Date(`${endYearVal}-05-30`) : undefined)),
        current: Boolean(modalFormData.current),
        description: modalFormData.description?.trim() || '',
      };
      if (editingItemIndex !== null) {
        updatedList[editingItemIndex] = entry;
      } else {
        updatedList.push(entry);
      }
      setProfileData((prev) => ({ ...prev, education: updatedList }));
    } else if (modalType === 'experience') {
      if (!modalFormData.company?.trim() || !modalFormData.title?.trim()) return;
      const updatedList = [...profileData.experience];
      const entry = {
        company: modalFormData.company.trim(),
        title: modalFormData.title.trim(),
        location: modalFormData.location?.trim() || '',
        startDate: modalFormData.startDate || undefined,
        endDate: modalFormData.current ? undefined : modalFormData.endDate || undefined,
        current: Boolean(modalFormData.current),
        description: modalFormData.description?.trim() || '',
      };
      if (editingItemIndex !== null) {
        updatedList[editingItemIndex] = entry;
      } else {
        updatedList.push(entry);
      }
      setProfileData((prev) => ({ ...prev, experience: updatedList }));
    } else if (modalType === 'project') {
      if (!modalFormData.title?.trim()) return;
      const updatedList = [...profileData.projects];
      const techs = Array.isArray(modalFormData.technologies)
        ? modalFormData.technologies
        : typeof modalFormData.technologies === 'string'
        ? modalFormData.technologies
            .split(',')
            .map((t) => t.trim())
            .filter(Boolean)
        : [];
      const entry = {
        title: modalFormData.title.trim(),
        description: modalFormData.description?.trim() || '',
        link: modalFormData.link?.trim() || '',
        technologies: techs,
      };
      if (editingItemIndex !== null) {
        updatedList[editingItemIndex] = entry;
      } else {
        updatedList.push(entry);
      }
      setProfileData((prev) => ({ ...prev, projects: updatedList }));
    } else if (modalType === 'certification') {
      if (!modalFormData.name?.trim() || !modalFormData.issuingOrganization?.trim()) return;
      const updatedList = [...profileData.certifications];
      const entry = {
        name: modalFormData.name.trim(),
        issuingOrganization: modalFormData.issuingOrganization.trim(),
        issueDate: modalFormData.issueDate || undefined,
        expiryDate: modalFormData.expiryDate || undefined,
        credentialId: modalFormData.credentialId?.trim() || '',
        credentialUrl: modalFormData.credentialUrl?.trim() || '',
      };
      if (editingItemIndex !== null) {
        updatedList[editingItemIndex] = entry;
      } else {
        updatedList.push(entry);
      }
      setProfileData((prev) => ({ ...prev, certifications: updatedList }));
    }

    closeModal();
  };

  const handleDeleteItem = (type, index) => {
    if (window.confirm(`Are you sure you want to remove this ${type} item?`)) {
      setProfileData((prev) => ({
        ...prev,
        [type]: prev[type].filter((_, i) => i !== index),
      }));
    }
  };

  // ---------------- Job Preferences Handlers ----------------
  const handleAddDesiredRole = (roleToAdd) => {
    const trimmed = (roleToAdd || newRoleInput).trim();
    if (!trimmed) return;
    const currentRoles = profileData.jobPreferences?.desiredRoles || [];
    if (currentRoles.some((r) => r.toLowerCase() === trimmed.toLowerCase())) {
      setNewRoleInput('');
      return;
    }
    setProfileData((prev) => ({
      ...prev,
      jobPreferences: {
        ...prev.jobPreferences,
        desiredRoles: [...currentRoles, trimmed],
      },
    }));
    setNewRoleInput('');
  };

  const handleRemoveDesiredRole = (roleToRemove) => {
    setProfileData((prev) => ({
      ...prev,
      jobPreferences: {
        ...prev.jobPreferences,
        desiredRoles: (prev.jobPreferences?.desiredRoles || []).filter((r) => r !== roleToRemove),
      },
    }));
  };

  const handleAddPreferredCity = (cityToAdd) => {
    const trimmed = (cityToAdd || newCityInput).trim();
    if (!trimmed) return;
    const currentCities = profileData.jobPreferences?.preferredCities || [];
    if (currentCities.some((c) => c.toLowerCase() === trimmed.toLowerCase())) {
      setNewCityInput('');
      return;
    }
    setProfileData((prev) => ({
      ...prev,
      jobPreferences: {
        ...prev.jobPreferences,
        preferredCities: [...currentCities, trimmed],
      },
    }));
    setNewCityInput('');
  };

  const handleRemovePreferredCity = (cityToRemove) => {
    setProfileData((prev) => ({
      ...prev,
      jobPreferences: {
        ...prev.jobPreferences,
        preferredCities: (prev.jobPreferences?.preferredCities || []).filter((c) => c !== cityToRemove),
      },
    }));
  };

  const handlePrefChange = (field, value) => {
    setProfileData((prev) => ({
      ...prev,
      jobPreferences: {
        ...prev.jobPreferences,
        [field]: value,
      },
    }));
  };

  const handleSalaryChange = (subKey, value) => {
    setProfileData((prev) => ({
      ...prev,
      jobPreferences: {
        ...prev.jobPreferences,
        expectedSalary: {
          ...(prev.jobPreferences?.expectedSalary || { currency: 'INR' }),
          [subKey]: value === '' ? '' : Number(value),
        },
      },
    }));
  };

  const handleToggleEmploymentType = (type) => {
    setProfileData((prev) => {
      const current = prev.jobPreferences?.employmentTypes || [];
      const updated = current.includes(type)
        ? current.filter((t) => t !== type)
        : [...current, type];
      return {
        ...prev,
        jobPreferences: {
          ...prev.jobPreferences,
          employmentTypes: updated,
        },
      };
    });
  };

  // ---------------- Avatar Photo Management ----------------
  const handleAvatarFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate type: JPG, JPEG, PNG, WebP
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    const ext = file.name.split('.').pop()?.toLowerCase();
    const allowedExts = ['jpg', 'jpeg', 'png', 'webp'];

    if (!allowedTypes.includes(file.type) && !allowedExts.includes(ext)) {
      setErrorMessage('Please select a JPG, JPEG, PNG, or WebP image file.');
      e.target.value = '';
      return;
    }

    // Validate size limit (2MB)
    const maxSizeBytes = 2 * 1024 * 1024;
    if (file.size > maxSizeBytes) {
      setErrorMessage('Profile photo file size must be less than 2 MB.');
      e.target.value = '';
      return;
    }

    // Revoke any previous unapplied crop image
    if (selectedCropImage && selectedCropImage.startsWith('blob:')) {
      URL.revokeObjectURL(selectedCropImage);
    }

    // Create object URL and open crop modal
    const tempUrl = URL.createObjectURL(file);
    setSelectedCropImage(tempUrl);
    setIsCropModalOpen(true);
    setErrorMessage('');
    e.target.value = '';
  };

  const handleCloseCropModal = () => {
    if (selectedCropImage && selectedCropImage.startsWith('blob:')) {
      URL.revokeObjectURL(selectedCropImage);
    }
    setSelectedCropImage(null);
    setIsCropModalOpen(false);
  };

  const handleApplyCroppedAvatar = async (croppedFile) => {
    if (!croppedFile) return;

    // Show instant local preview of cropped image
    const previewUrl = URL.createObjectURL(croppedFile);
    setAvatarPreview(previewUrl);

    // Close crop modal and clean up source image URL
    if (selectedCropImage && selectedCropImage.startsWith('blob:')) {
      URL.revokeObjectURL(selectedCropImage);
    }
    setSelectedCropImage(null);
    setIsCropModalOpen(false);

    try {
      setIsUploadingAvatar(true);
      setErrorMessage('');

      const response = await uploadUserAvatar(croppedFile);

      if (response && response.data?.avatarUrl) {
        const newAvatarUrl = response.data.avatarUrl;
        setProfileData((prev) => ({
          ...prev,
          profile: {
            ...prev.profile,
            avatarUrl: newAvatarUrl,
          },
        }));
        setInitialData((prev) => ({
          ...prev,
          profile: {
            ...prev.profile,
            avatarUrl: newAvatarUrl,
          },
        }));
        if (updateUser) {
          updateUser({
            profile: {
              ...(authUser?.profile || {}),
              avatarUrl: newAvatarUrl,
            },
          });
        }
        setSaveSuccess('Profile photo updated successfully!');
        setTimeout(() => setSaveSuccess(''), 4000);
      }
    } catch (err) {
      setErrorMessage(err.message || 'Failed to upload profile photo.');
      // Revert preview back to null on failure so original photo is preserved
      setAvatarPreview(null);
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  const handleRemoveAvatar = async () => {
    if (!window.confirm('Are you sure you want to remove your profile photo?')) return;
    try {
      setIsUploadingAvatar(true);
      setErrorMessage('');
      await deleteUserAvatar();

      setAvatarPreview(null);
      setProfileData((prev) => ({
        ...prev,
        profile: {
          ...prev.profile,
          avatarUrl: '',
        },
      }));
      setInitialData((prev) => ({
        ...prev,
        profile: {
          ...prev.profile,
          avatarUrl: '',
        },
      }));
      if (updateUser) {
        updateUser({
          profile: {
            ...(authUser?.profile || {}),
            avatarUrl: '',
          },
        });
      }
      setSaveSuccess('Profile photo removed.');
      setTimeout(() => setSaveSuccess(''), 4000);
    } catch (err) {
      setErrorMessage(err.message || 'Failed to remove profile photo.');
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  // ---------------- Resume Management ----------------
  const handleDownloadResume = async () => {
    if (!profileData.resume?.originalName) return;
    try {
      setIsDownloadingResume(true);
      setErrorMessage('');
      await downloadUserResume();
    } catch (err) {
      setErrorMessage(err.message || 'Failed to download resume.');
    } finally {
      setIsDownloadingResume(false);
    }
  };

  const handleResumeFileSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate type: PDF, DOC, DOCX
    const allowedTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ];
    if (!allowedTypes.includes(file.type) && !file.name.match(/\.(pdf|doc|docx)$/i)) {
      setErrorMessage('Please upload a PDF or Microsoft Word document (.pdf, .doc, .docx).');
      return;
    }

    // Validate size limit (5MB)
    const maxSizeBytes = 5 * 1024 * 1024;
    if (file.size > maxSizeBytes) {
      setErrorMessage('Resume file size must be less than 5 MB.');
      return;
    }

    try {
      setIsSaving(true);
      setErrorMessage('');
      const response = await uploadResumeFile(file);

      if (response && response.data) {
        setProfileData((prev) => ({
          ...prev,
          resume: response.data,
        }));
        setInitialData((prev) => ({
          ...prev,
          resume: response.data,
        }));
        setSaveSuccess('Resume uploaded and stored securely!');
        setTimeout(() => setSaveSuccess(''), 4000);
      }
    } catch (err) {
      setErrorMessage(err.message || 'Failed to upload resume.');
    } finally {
      setIsSaving(false);
      // Reset input
      e.target.value = '';
    }
  };

  const handleDeleteResume = async () => {
    if (!window.confirm('Are you sure you want to remove your resume?')) return;
    try {
      setIsSaving(true);
      setErrorMessage('');
      await deleteUserResume();
      setProfileData((prev) => ({
        ...prev,
        resume: null,
      }));
      setInitialData((prev) => ({
        ...prev,
        resume: null,
      }));
      setSaveSuccess('Resume removed successfully.');
      setTimeout(() => setSaveSuccess(''), 4000);
    } catch (err) {
      setErrorMessage(err.message || 'Failed to remove resume.');
    } finally {
      setIsSaving(false);
    }
  };

  // ---------------- Save Profile Handler ----------------
  const handleSaveProfile = async () => {
    if (!profileData.name || profileData.name.trim().length < 2) {
      setErrorMessage('Name must be at least 2 characters long.');
      return;
    }

    try {
      setIsSaving(true);
      setErrorMessage('');
      setSaveSuccess('');

      const payload = {
        name: profileData.name.trim(),
        profile: profileData.profile,
      };

      if (profileData.role === 'candidate') {
        if (profileData.jobPreferences?.expectedSalary) {
          const { min, max } = profileData.jobPreferences.expectedSalary;
          if (min !== '' && max !== '' && Number(min) > Number(max)) {
            setErrorMessage('Maximum expected salary cannot be less than minimum expected salary.');
            return;
          }
        }

        payload.skills = profileData.skills;
        payload.education = profileData.education;
        payload.experience = profileData.experience;
        payload.projects = profileData.projects;
        payload.certifications = profileData.certifications;
        payload.jobPreferences = profileData.jobPreferences;
      }

      const response = await updateUserProfile(payload);
      if (response && response.data) {
        const saved = response.data;
        setProfileData((prev) => ({
          ...prev,
          ...saved,
          completeness: saved.completeness ?? prev.completeness,
        }));
        setInitialData(JSON.parse(JSON.stringify({
          ...profileData,
          ...saved,
          completeness: saved.completeness ?? profileData.completeness,
        })));
        // Sync context user
        if (updateUser) {
          updateUser({
            name: saved.name,
            profile: saved.profile,
            completeness: saved.completeness,
          });
        }
        setSaveSuccess('Profile updated successfully!');
        setTimeout(() => setSaveSuccess(''), 4000);
      }
    } catch (err) {
      setErrorMessage(err.message || 'Failed to save profile changes.');
    } finally {
      setIsSaving(false);
    }
  };

  // Cancel & Revert
  const handleCancelChanges = () => {
    if (initialData) {
      setProfileData(JSON.parse(JSON.stringify(initialData)));
      setErrorMessage('');
    }
  };

  // Helper to format dates
  const formatDate = (dateString) => {
    if (!dateString) return '';
    try {
      const d = new Date(dateString);
      return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short' });
    } catch (_) {
      return dateString;
    }
  };

  // Helper to format bytes
  const formatBytes = (bytes) => {
    if (!bytes || bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  // Completeness missing tips
  const missingTips = useMemo(() => {
    if (!profileData) return [];
    const tips = [];
    if (profileData.role === 'recruiter') {
      if (!profileData.profile?.company) tips.push('Add your company name (+20%)');
      if (!profileData.profile?.headline) tips.push('Add your recruiter headline (+15%)');
      if (!profileData.profile?.companyWebsite) tips.push('Add your company website (+15%)');
      if (!profileData.profile?.industry) tips.push('Specify industry (+15%)');
      if (!profileData.profile?.companyDescription) tips.push('Add company description (+15%)');
    } else {
      if (!profileData.profile?.headline) tips.push('Add a professional headline (+10%)');
      if (!profileData.profile?.bio) tips.push('Add a biography (+10%)');
      if (!profileData.profile?.location) tips.push('Add your location (+10%)');
      if (!profileData.profile?.phone) tips.push('Add contact phone (+10%)');
      if (!profileData.skills || profileData.skills.length < 3) tips.push('Add at least 3 skills (+15%)');
      if (!profileData.experience || profileData.experience.length === 0) tips.push('Add work experience (+15%)');
      if (!profileData.education || profileData.education.length === 0) tips.push('Add education history (+10%)');
      if (!profileData.resume?.originalName) tips.push('Upload your resume (+10%)');
      if (
        !profileData.jobPreferences ||
        ((!profileData.jobPreferences.desiredRoles || profileData.jobPreferences.desiredRoles.length === 0) &&
         (!profileData.jobPreferences.preferredCities || profileData.jobPreferences.preferredCities.length === 0))
      ) {
        tips.push('Set your career preferences & target roles (+5%)');
      }
    }
    return tips;
  }, [profileData]);

  if (isLoading) {
    return (
      <div className="profile-page-loading" aria-live="polite">
        <div className="spinner-large" />
        <p>Loading your profile details...</p>
      </div>
    );
  }

  if (!profileData) {
    return (
      <div className="profile-error-container">
        <AlertCircle size={40} className="text-error" />
        <h2>Unable to load profile</h2>
        <p>{errorMessage || 'An error occurred while retrieving your profile.'}</p>
        <button type="button" className="btn btn-primary" onClick={loadProfile}>
          <RefreshCw size={16} />
          <span>Try Again</span>
        </button>
      </div>
    );
  }

  const isRecruiter = profileData.role === 'recruiter';
  const completeness = profileData.completeness || 0;
  const currentAvatarSrc =
    avatarPreview ||
    (profileData.profile?.avatarUrl ? resolveAvatarUrl(profileData.profile.avatarUrl) : '');
  const showAvatarImage = Boolean(currentAvatarSrc && !avatarLoadError);

  return (
    <div className="profile-dashboard-layout">
      {/* Top Banner Navigation / Breadcrumb */}
      <div className="profile-top-bar">
        <button
          type="button"
          className="btn-back-home"
          onClick={() => navigate('/')}
          aria-label="Back to jobs home"
        >
          <ArrowLeft size={16} />
          <span>Back to Jobs</span>
        </button>

        <div className="profile-save-controls">
          {hasUnsavedChanges && (
            <span className="unsaved-badge" role="status">
              <span className="unsaved-dot" />
              Unsaved changes
            </span>
          )}
          {hasUnsavedChanges && (
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={handleCancelChanges}
              disabled={isSaving}
            >
              Cancel
            </button>
          )}
          <button
            type="button"
            className="btn btn-primary btn-sm"
            onClick={handleSaveProfile}
            disabled={isSaving || !hasUnsavedChanges}
          >
            {isSaving ? (
              <>
                <RefreshCw size={14} className="spin-icon" />
                <span>Saving...</span>
              </>
            ) : (
              <>
                <Save size={14} />
                <span>Save Profile</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Success / Error Notification Banners */}
      {saveSuccess && (
        <div className="profile-alert alert-success" role="alert">
          <CheckCircle2 size={18} />
          <span>{saveSuccess}</span>
          <button
            type="button"
            className="alert-close"
            onClick={() => setSaveSuccess('')}
            aria-label="Dismiss alert"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {errorMessage && (
        <div className="profile-alert alert-danger" role="alert">
          <AlertCircle size={18} />
          <span>{errorMessage}</span>
          <button
            type="button"
            className="alert-close"
            onClick={() => setErrorMessage('')}
            aria-label="Dismiss alert"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* Main Profile Header Card */}
      <section className="profile-hero-card">
        <div className="profile-hero-main">
          {/* Avatar & Photo Action */}
          <div className="avatar-hero-container">
            <div className="profile-avatar-wrapper">
              {showAvatarImage ? (
                <img
                  key={currentAvatarSrc}
                  src={currentAvatarSrc}
                  alt={profileData.name}
                  className="profile-avatar-image"
                  onLoad={() => setAvatarLoadError(false)}
                  onError={() => setAvatarLoadError(true)}
                />
              ) : (
                <div className="profile-avatar-initials">
                  {getUserInitials(profileData.name)}
                </div>
              )}
            </div>

            <div className="avatar-actions-row">
              <input
                ref={avatarFileInputRef}
                id="profile-avatar-input"
                type="file"
                accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp"
                className="sr-only avatar-hidden-input"
                onChange={handleAvatarFileSelect}
                disabled={isUploadingAvatar}
                tabIndex={-1}
                aria-hidden="true"
              />
              <button
                type="button"
                className="btn btn-outline btn-sm avatar-upload-btn"
                onClick={() => avatarFileInputRef.current?.click()}
                disabled={isUploadingAvatar}
                aria-label={
                  isUploadingAvatar
                    ? 'Uploading profile photo...'
                    : (profileData.profile?.avatarUrl ? 'Change profile photo' : 'Upload profile photo')
                }
              >
                <Camera size={14} aria-hidden="true" />
                <span>
                  {isUploadingAvatar
                    ? 'Uploading...'
                    : (profileData.profile?.avatarUrl ? 'Change Photo' : 'Upload Photo')}
                </span>
              </button>
              {profileData.profile?.avatarUrl && (
                <button
                  type="button"
                  className="btn btn-ghost btn-sm avatar-remove-btn text-danger"
                  onClick={handleRemoveAvatar}
                  disabled={isUploadingAvatar}
                  title="Remove profile photo"
                  aria-label="Remove profile photo"
                >
                  <Trash2 size={13} aria-hidden="true" />
                  <span>Remove Photo</span>
                </button>
              )}
            </div>
          </div>

          {/* User Primary Meta */}
          <div className="profile-hero-info">
            <div className="profile-hero-title-row">
              <h1 className="profile-user-name">{profileData.name}</h1>
              <span className={`user-role-badge role-${profileData.role}`}>
                <ShieldCheck size={13} className="mr-1" />
                {profileData.role.toUpperCase()}
              </span>
            </div>

            <p className="profile-hero-headline">
              {profileData.profile?.headline || (isRecruiter ? 'Recruiter at ' + (profileData.profile?.company || 'Company') : 'Professional Job Seeker')}
            </p>

            <div className="profile-hero-contact-chips">
              <span className="hero-contact-item">
                <Mail size={14} />
                <span>{profileData.email}</span>
              </span>
              {profileData.profile?.location && (
                <span className="hero-contact-item">
                  <MapPin size={14} />
                  <span>{profileData.profile.location}</span>
                </span>
              )}
              {profileData.profile?.phone && (
                <span className="hero-contact-item">
                  <Phone size={14} />
                  <span>{profileData.profile.phone}</span>
                </span>
              )}
              {isRecruiter && profileData.profile?.company && (
                <span className="hero-contact-item">
                  <Building2 size={14} />
                  <span>{profileData.profile.company}</span>
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Profile Completeness Bar */}
        <div className="profile-completeness-card">
          <div className="completeness-header">
            <div className="completeness-title">
              <Sparkles size={16} className="text-accent" />
              <span>Profile Strength</span>
            </div>
            <span className="completeness-score">{completeness}%</span>
          </div>

          <div className="completeness-progress-track">
            <div
              className={`completeness-progress-bar ${
                completeness >= 80 ? 'strength-high' : completeness >= 40 ? 'strength-medium' : 'strength-low'
              }`}
              style={{ width: `${completeness}%` }}
              role="progressbar"
              aria-valuenow={completeness}
              aria-valuemin="0"
              aria-valuemax="100"
            />
          </div>

          {missingTips.length > 0 && (
            <div className="completeness-tips-list">
              <span className="tips-title">Quick tips to reach 100%:</span>
              <ul>
                {missingTips.slice(0, 3).map((tip, idx) => (
                  <li key={idx}>+ {tip}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </section>

      {/* Profile Section Tabs */}
      <nav className="profile-tabs-nav" aria-label="Profile Sections">
        <button
          type="button"
          className={`profile-tab-btn ${activeTab === 'personal' ? 'active' : ''}`}
          onClick={() => setActiveTab('personal')}
        >
          <User size={16} />
          <span>Personal Info</span>
        </button>

        {isRecruiter ? (
          <button
            type="button"
            className={`profile-tab-btn ${activeTab === 'company' ? 'active' : ''}`}
            onClick={() => setActiveTab('company')}
          >
            <Building2 size={16} />
            <span>Company Profile</span>
          </button>
        ) : (
          <>
            <button
              type="button"
              className={`profile-tab-btn ${activeTab === 'about' ? 'active' : ''}`}
              onClick={() => setActiveTab('about')}
            >
              <FileText size={16} />
              <span>About & Links</span>
            </button>
            <button
              type="button"
              className={`profile-tab-btn ${activeTab === 'skills' ? 'active' : ''}`}
              onClick={() => setActiveTab('skills')}
            >
              <Award size={16} />
              <span>Skills ({profileData.skills.length})</span>
            </button>
            <button
              type="button"
              className={`profile-tab-btn ${activeTab === 'experience' ? 'active' : ''}`}
              onClick={() => setActiveTab('experience')}
            >
              <Briefcase size={16} />
              <span>Experience ({profileData.experience.length})</span>
            </button>
            <button
              type="button"
              className={`profile-tab-btn ${activeTab === 'education' ? 'active' : ''}`}
              onClick={() => setActiveTab('education')}
            >
              <GraduationCap size={16} />
              <span>Education ({profileData.education.length})</span>
            </button>
            <button
              type="button"
              className={`profile-tab-btn ${activeTab === 'projects' ? 'active' : ''}`}
              onClick={() => setActiveTab('projects')}
            >
              <FolderGit2 size={16} />
              <span>Projects ({profileData.projects.length})</span>
            </button>
            <button
              type="button"
              className={`profile-tab-btn ${activeTab === 'certifications' ? 'active' : ''}`}
              onClick={() => setActiveTab('certifications')}
            >
              <ShieldCheck size={16} />
              <span>Certifications ({profileData.certifications.length})</span>
            </button>
            <button
              type="button"
              className={`profile-tab-btn ${activeTab === 'preferences' ? 'active' : ''}`}
              onClick={() => setActiveTab('preferences')}
            >
              <Target size={16} />
              <span>Job Preferences</span>
            </button>
            <button
              type="button"
              className={`profile-tab-btn ${activeTab === 'resume' ? 'active' : ''}`}
              onClick={() => setActiveTab('resume')}
            >
              <FileText size={16} />
              <span>Resume</span>
            </button>
          </>
        )}
      </nav>

      {/* Tab Panels */}
      <div className="profile-tab-content">
        {/* ================= PERSONAL INFO TAB ================= */}
        {activeTab === 'personal' && (
          <div className="profile-section-card">
            <h2 className="section-card-title">Personal Information</h2>
            <p className="section-card-desc">
              Update your personal and contact details. Your email address and account role are protected.
            </p>

            <div className="form-grid">
              <div className="form-group">
                <label htmlFor="profile-name">
                  Full Name <span className="text-danger">*</span>
                </label>
                <input
                  id="profile-name"
                  type="text"
                  className="form-input"
                  value={profileData.name}
                  onChange={(e) => handleFieldChange('name', e.target.value)}
                  placeholder="e.g. Jane Doe"
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="profile-email">
                  Email Address <span className="read-only-tag">(Read-Only)</span>
                </label>
                <input
                  id="profile-email"
                  type="email"
                  className="form-input disabled"
                  value={profileData.email}
                  disabled
                  readOnly
                />
              </div>

              <div className="form-group">
                <label htmlFor="profile-phone">Phone Number (+91 default)</label>
                <input
                  id="profile-phone"
                  type="tel"
                  className="form-input"
                  value={profileData.profile?.phone || ''}
                  onChange={(e) => handleProfileFieldChange('phone', e.target.value)}
                  placeholder="+91 98765 43210"
                />
              </div>

              <div className="form-group">
                <label htmlFor="profile-location">Location / Indian City</label>
                <input
                  id="profile-location"
                  type="text"
                  list="profile-indian-cities"
                  className="form-input"
                  value={profileData.profile?.location || ''}
                  onChange={(e) => handleProfileFieldChange('location', e.target.value)}
                  placeholder="e.g. Bengaluru, Karnataka or Remote"
                />
                <datalist id="profile-indian-cities">
                  {INDIAN_CITIES.map((c) => (
                    <option key={c} value={c} />
                  ))}
                </datalist>
              </div>

              {isRecruiter && (
                <>
                  <div className="form-group full-width">
                    <label htmlFor="profile-headline">Recruiter Headline / Title</label>
                    <input
                      id="profile-headline"
                      type="text"
                      className="form-input"
                      value={profileData.profile?.headline || ''}
                      onChange={(e) => handleProfileFieldChange('headline', e.target.value)}
                      placeholder="e.g. Senior Talent Acquisition Specialist at CloudCorp"
                    />
                  </div>
                  <div className="form-group full-width">
                    <label htmlFor="profile-bio">About You / Recruiter Bio</label>
                    <textarea
                      id="profile-bio"
                      rows={4}
                      className="form-textarea"
                      value={profileData.profile?.bio || ''}
                      onChange={(e) => handleProfileFieldChange('bio', e.target.value)}
                      placeholder="Describe your hiring focus, team culture, and how candidates can connect..."
                    />
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {/* ================= RECRUITER COMPANY PROFILE TAB ================= */}
        {isRecruiter && activeTab === 'company' && (
          <div className="profile-section-card">
            <h2 className="section-card-title">Company Profile & Employer Branding</h2>
            <p className="section-card-desc">
              Manage your Indian organization details to attract top talent across CareerPulse ATS.
            </p>

            {/* Verification Status Banner */}
            <div className="company-verification-card mb-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ShieldCheck size={20} className={profileData.profile?.verificationStatus === 'verified' ? 'text-emerald' : 'text-amber'} />
                  <span className="font-bold text-sm">
                    Organization Status:{' '}
                    <span className="capitalize">
                      {profileData.profile?.verificationStatus === 'verified'
                        ? 'Verified Employer'
                        : profileData.profile?.verificationStatus === 'pending'
                        ? 'Verification Under Review'
                        : 'Unverified Account'}
                    </span>
                  </span>
                </div>
                <span className={`text-xs px-2.5 py-1 rounded-full font-semibold ${
                  profileData.profile?.verificationStatus === 'verified'
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    : profileData.profile?.verificationStatus === 'pending'
                    ? 'bg-amber-50 text-amber-700 border border-amber-200'
                    : 'bg-slate-100 text-slate-700 border border-slate-200'
                }`}>
                  {profileData.profile?.verificationStatus?.toUpperCase() || 'UNVERIFIED'}
                </span>
              </div>
              <p className="text-xs text-muted mt-2">
                {profileData.profile?.verificationStatus === 'verified'
                  ? 'Your company details have been authenticated. All posted vacancies display the verified employer badge.'
                  : profileData.profile?.verificationStatus === 'pending'
                  ? 'Your business verification reference is pending administrator review. You may still publish job openings.'
                  : 'Submit a registered business identifier (CIN, GSTIN, or Udyam) below to request verified employer status.'}
              </p>
            </div>

            <div className="form-grid">
              <div className="form-group">
                <label htmlFor="company-name">Company Name <span className="text-danger">*</span></label>
                <input
                  id="company-name"
                  type="text"
                  className="form-input"
                  value={profileData.profile?.company || ''}
                  onChange={(e) => handleProfileFieldChange('company', e.target.value)}
                  placeholder="e.g. Infosys, Razorpay, or TechNova Labs"
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="company-hq">Headquarters (Indian City / State)</label>
                <input
                  id="company-hq"
                  type="text"
                  list="profile-indian-cities"
                  className="form-input"
                  value={profileData.profile?.headquarters || ''}
                  onChange={(e) => handleProfileFieldChange('headquarters', e.target.value)}
                  placeholder="e.g. Bengaluru, Karnataka"
                />
              </div>

              <div className="form-group">
                <label htmlFor="company-website">Company Website</label>
                <input
                  id="company-website"
                  type="url"
                  className="form-input"
                  value={profileData.profile?.companyWebsite || ''}
                  onChange={(e) => handleProfileFieldChange('companyWebsite', e.target.value)}
                  placeholder="https://example.com"
                />
              </div>

              <div className="form-group">
                <label htmlFor="company-registration">
                  Company Registration (CIN / GSTIN / LLPIN / Udyam)
                </label>
                <input
                  id="company-registration"
                  type="text"
                  className="form-input"
                  value={profileData.profile?.companyRegistration || ''}
                  onChange={(e) => handleProfileFieldChange('companyRegistration', e.target.value)}
                  placeholder="e.g. U72200KA2020PTC123456 or GSTIN..."
                />
              </div>

              <div className="form-group">
                <label htmlFor="company-industry">Industry</label>
                <input
                  id="company-industry"
                  type="text"
                  className="form-input"
                  value={profileData.profile?.industry || ''}
                  onChange={(e) => handleProfileFieldChange('industry', e.target.value)}
                  placeholder="e.g. SaaS, Fintech, E-Commerce, IT Services"
                />
              </div>

              <div className="form-group">
                <label htmlFor="company-size">Company Size</label>
                <select
                  id="company-size"
                  className="form-select"
                  value={profileData.profile?.companySize || ''}
                  onChange={(e) => handleProfileFieldChange('companySize', e.target.value)}
                >
                  <option value="">Select company size...</option>
                  {COMPANY_SIZES.map((sz) => (
                    <option key={sz} value={sz}>
                      {sz}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group full-width">
                <label htmlFor="company-description">Company Description & Mission</label>
                <textarea
                  id="company-description"
                  rows={4}
                  className="form-textarea"
                  value={profileData.profile?.companyDescription || ''}
                  onChange={(e) => handleProfileFieldChange('companyDescription', e.target.value)}
                  placeholder="Describe your organization's mission, engineering culture, and work benefits in India..."
                />
              </div>
            </div>
          </div>
        )}

        {/* ================= CANDIDATE ABOUT & LINKS TAB ================= */}
        {!isRecruiter && activeTab === 'about' && (
          <div className="profile-section-group">
            <div className="profile-section-card">
              <h2 className="section-card-title">Professional Headline & Summary</h2>
              <p className="section-card-desc">
                Summarize your domain expertise, target focus, and technical background for prospective employers.
              </p>

              <div className="form-grid">
                <div className="form-group full-width">
                  <label htmlFor="profile-headline">
                    Professional Headline / Title
                  </label>
                  <input
                    id="profile-headline"
                    type="text"
                    className="form-input"
                    value={profileData.profile?.headline || ''}
                    onChange={(e) => handleProfileFieldChange('headline', e.target.value)}
                    placeholder="e.g. Senior Full-Stack Engineer | React & Node.js | Microservices"
                  />
                </div>

                <div className="form-group full-width">
                  <label htmlFor="profile-bio">Biography / Summary</label>
                  <textarea
                    id="profile-bio"
                    rows={5}
                    className="form-textarea"
                    value={profileData.profile?.bio || ''}
                    onChange={(e) => handleProfileFieldChange('bio', e.target.value)}
                    placeholder="Tell recruiters and peers about your background, key strengths, achievements, and engineering philosophy..."
                  />
                </div>
              </div>
            </div>

            {/* Social & Portfolio Links Card */}
            <div className="profile-section-card mt-6">
              <h2 className="section-card-title">Social & Online Profiles</h2>
              <p className="section-card-desc">
                Help recruiters discover your code repositories, personal portfolio, and professional networks.
              </p>

              <div className="form-grid">
                <div className="form-group">
                  <label htmlFor="link-linkedin">LinkedIn URL</label>
                  <input
                    id="link-linkedin"
                    type="url"
                    className="form-input"
                    value={profileData.profile?.linkedin || ''}
                    onChange={(e) => handleProfileFieldChange('linkedin', e.target.value)}
                    placeholder="https://linkedin.com/in/username"
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="link-github">GitHub Profile URL</label>
                  <input
                    id="link-github"
                    type="url"
                    className="form-input"
                    value={profileData.profile?.github || ''}
                    onChange={(e) => handleProfileFieldChange('github', e.target.value)}
                    placeholder="https://github.com/username"
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="link-portfolio">Portfolio Website</label>
                  <input
                    id="link-portfolio"
                    type="url"
                    className="form-input"
                    value={profileData.profile?.portfolio || ''}
                    onChange={(e) => handleProfileFieldChange('portfolio', e.target.value)}
                    placeholder="https://yourportfolio.dev"
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="link-twitter">Twitter / X / Blog URL</label>
                  <input
                    id="link-twitter"
                    type="url"
                    className="form-input"
                    value={profileData.profile?.twitter || ''}
                    onChange={(e) => handleProfileFieldChange('twitter', e.target.value)}
                    placeholder="https://twitter.com/username"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ================= CANDIDATE SKILLS TAB ================= */}
        {!isRecruiter && activeTab === 'skills' && (
          <div className="profile-section-card">
            <h2 className="section-card-title">Technical & Professional Skills</h2>
            <p className="section-card-desc">
              List the programming languages, tools, and methodologies you excel at. Candidates with 3+ skills are 40% more visible to recruiters.
            </p>

            {/* Skill Input Row */}
            <div className="skill-input-bar">
              <input
                type="text"
                className="form-input"
                placeholder="Type a skill and press Enter or Add (e.g. Docker, GraphQL)"
                value={newSkillInput}
                onChange={(e) => setNewSkillInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddSkill();
                  }
                }}
              />
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => handleAddSkill()}
                disabled={!newSkillInput.trim()}
              >
                <Plus size={16} />
                <span>Add Skill</span>
              </button>
            </div>

            {/* Selected Skills Chips */}
            <div className="profile-skills-box">
              <span className="skills-box-label">Your Current Skills ({profileData.skills.length}):</span>
              {profileData.skills.length === 0 ? (
                <p className="empty-state-text">No skills added yet. Add your first skill above!</p>
              ) : (
                <div className="skills-badge-list">
                  {profileData.skills.map((skill) => (
                    <span key={skill} className="skill-chip">
                      <span>{skill}</span>
                      <button
                        type="button"
                        className="skill-chip-remove"
                        onClick={() => handleRemoveSkill(skill)}
                        aria-label={`Remove skill ${skill}`}
                      >
                        <X size={12} />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Suggested Skills */}
            <div className="suggested-skills-box">
              <span className="skills-box-label">Quick Suggestions:</span>
              <div className="suggested-badges">
                {POPULAR_SKILL_SUGGESTIONS.filter(
                  (s) => !profileData.skills.includes(s.toLowerCase())
                ).map((s) => (
                  <button
                    key={s}
                    type="button"
                    className="suggested-chip"
                    onClick={() => handleAddSkill(s)}
                  >
                    <Plus size={12} />
                    <span>{s}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ================= CANDIDATE WORK EXPERIENCE TAB ================= */}
        {!isRecruiter && activeTab === 'experience' && (
          <div className="profile-section-card">
            <div className="section-card-header">
              <div>
                <h2 className="section-card-title">Work Experience</h2>
                <p className="section-card-desc">
                  Highlight your relevant career history, roles, and accomplishments.
                </p>
              </div>
              <button
                type="button"
                className="btn btn-outline btn-sm"
                onClick={() => openModal('experience')}
              >
                <Plus size={15} />
                <span>Add Experience</span>
              </button>
            </div>

            {profileData.experience.length === 0 ? (
              <div className="empty-sub-section">
                <Briefcase size={36} className="text-secondary" />
                <p>No work experience entries added yet.</p>
                <button
                  type="button"
                  className="btn btn-outline btn-sm"
                  onClick={() => openModal('experience')}
                >
                  <Plus size={14} />
                  <span>Add First Experience</span>
                </button>
              </div>
            ) : (
              <div className="item-timeline">
                {profileData.experience.map((exp, idx) => (
                  <div key={exp._id || idx} className="timeline-item-card">
                    <div className="timeline-item-header">
                      <div>
                        <h3 className="timeline-item-title">{exp.title}</h3>
                        <div className="timeline-item-subtitle">
                          <span className="font-semibold">{exp.company}</span>
                          {exp.location && <span> • {exp.location}</span>}
                        </div>
                        <div className="timeline-item-dates">
                          <Calendar size={13} />
                          <span>
                            {formatDate(exp.startDate)} – {exp.current ? 'Present' : formatDate(exp.endDate)}
                          </span>
                          {exp.current && <span className="badge-current">Current</span>}
                        </div>
                      </div>
                      <div className="timeline-item-actions">
                        <button
                          type="button"
                          className="btn-icon"
                          onClick={() => openModal('experience', exp, idx)}
                          aria-label="Edit experience"
                        >
                          <Edit2 size={15} />
                        </button>
                        <button
                          type="button"
                          className="btn-icon text-danger"
                          onClick={() => handleDeleteItem('experience', idx)}
                          aria-label="Delete experience"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </div>
                    {exp.description && (
                      <p className="timeline-item-desc">{exp.description}</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ================= CANDIDATE EDUCATION TAB ================= */}
        {!isRecruiter && activeTab === 'education' && (
          <div className="profile-section-card">
            <div className="section-card-header">
              <div>
                <h2 className="section-card-title">Education & Academics</h2>
                <p className="section-card-desc">
                  Degrees, diplomas, and institutions you have attended.
                </p>
              </div>
              <button
                type="button"
                className="btn btn-outline btn-sm"
                onClick={() => openModal('education')}
              >
                <Plus size={15} />
                <span>Add Education</span>
              </button>
            </div>

            {profileData.education.length === 0 ? (
              <div className="empty-sub-section">
                <GraduationCap size={36} className="text-secondary" />
                <p>No education history added yet.</p>
                <button
                  type="button"
                  className="btn btn-outline btn-sm"
                  onClick={() => openModal('education')}
                >
                  <Plus size={14} />
                  <span>Add First Education</span>
                </button>
              </div>
            ) : (
              <div className="item-timeline">
                {profileData.education.map((edu, idx) => (
                  <div key={edu._id || idx} className="timeline-item-card">
                    <div className="timeline-item-header">
                      <div>
                        <h3 className="timeline-item-title">{edu.institution}</h3>
                        <div className="timeline-item-subtitle">
                          {edu.degree} {edu.fieldOfStudy ? `in ${edu.fieldOfStudy}` : ''}
                        </div>
                        <div className="timeline-item-dates">
                          <Calendar size={13} />
                          <span>
                            {edu.startYear || (edu.startDate ? new Date(edu.startDate).getFullYear().toString() : '') || 'Start'} –{' '}
                            {edu.current
                              ? 'Present'
                              : (edu.endYear || (edu.endDate ? new Date(edu.endDate).getFullYear().toString() : '') || 'Completion')}
                          </span>
                          {edu.current && <span className="badge-current">Currently studying</span>}
                        </div>
                      </div>
                      <div className="timeline-item-actions">
                        <button
                          type="button"
                          className="btn-icon"
                          onClick={() => openModal('education', edu, idx)}
                          aria-label="Edit education"
                        >
                          <Edit2 size={15} />
                        </button>
                        <button
                          type="button"
                          className="btn-icon text-danger"
                          onClick={() => handleDeleteItem('education', idx)}
                          aria-label="Delete education"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </div>
                    {edu.description && (
                      <p className="timeline-item-desc">{edu.description}</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ================= CANDIDATE PROJECTS TAB ================= */}
        {!isRecruiter && activeTab === 'projects' && (
          <div className="profile-section-card">
              <div className="section-card-header">
                <div>
                  <h2 className="section-card-title">Projects & Portfolio</h2>
                  <p className="section-card-desc">
                    Showcase open source, personal, or notable commercial products.
                  </p>
                </div>
                <button
                  type="button"
                  className="btn btn-outline btn-sm"
                  onClick={() => openModal('project')}
                >
                  <Plus size={15} />
                  <span>Add Project</span>
                </button>
              </div>

              {profileData.projects.length === 0 ? (
                <div className="empty-sub-section">
                  <FolderGit2 size={36} className="text-secondary" />
                  <p>No projects added yet.</p>
                  <button
                    type="button"
                    className="btn btn-outline btn-sm"
                    onClick={() => openModal('project')}
                  >
                    <Plus size={14} />
                    <span>Add Project</span>
                  </button>
                </div>
              ) : (
                <div className="projects-grid">
                  {profileData.projects.map((proj, idx) => (
                    <div key={proj._id || idx} className="project-card">
                      <div className="project-card-header">
                        <h3 className="project-card-title">{proj.title}</h3>
                        <div className="timeline-item-actions">
                          <button
                            type="button"
                            className="btn-icon"
                            onClick={() => openModal('project', proj, idx)}
                            aria-label="Edit project"
                          >
                            <Edit2 size={14} />
                          </button>
                          <button
                            type="button"
                            className="btn-icon text-danger"
                            onClick={() => handleDeleteItem('projects', idx)}
                            aria-label="Delete project"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                      {proj.description && (
                        <p className="project-card-desc">{proj.description}</p>
                      )}
                      {Array.isArray(proj.technologies) && proj.technologies.length > 0 && (
                        <div className="project-tech-chips">
                          {proj.technologies.map((t, i) => (
                            <span key={i} className="tech-badge">
                              {t}
                            </span>
                          ))}
                        </div>
                      )}
                      {proj.link && (
                        <a
                          href={proj.link}
                          target="_blank"
                          rel="noreferrer noopener"
                          className="project-link"
                        >
                          <ExternalLink size={13} />
                          <span>View Project</span>
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
        )}

        {/* ================= CANDIDATE CERTIFICATIONS TAB ================= */}
        {!isRecruiter && activeTab === 'certifications' && (
          <div className="profile-section-card">
            <div className="section-card-header">
              <div>
                <h2 className="section-card-title">Certifications & Licenses</h2>
                  <p className="section-card-desc">
                    Professional credentials, licenses, and verified certifications.
                  </p>
                </div>
                <button
                  type="button"
                  className="btn btn-outline btn-sm"
                  onClick={() => openModal('certification')}
                >
                  <Plus size={15} />
                  <span>Add Certification</span>
                </button>
              </div>

              {profileData.certifications.length === 0 ? (
                <div className="empty-sub-section">
                  <Award size={36} className="text-secondary" />
                  <p>No certifications added yet.</p>
                  <button
                    type="button"
                    className="btn btn-outline btn-sm"
                    onClick={() => openModal('certification')}
                  >
                    <Plus size={14} />
                    <span>Add Certification</span>
                  </button>
                </div>
              ) : (
                <div className="cert-list">
                  {profileData.certifications.map((cert, idx) => (
                    <div key={cert._id || idx} className="cert-card">
                      <div className="cert-card-info">
                        <h3 className="cert-name">{cert.name}</h3>
                        <p className="cert-issuer">{cert.issuingOrganization}</p>
                        <div className="cert-dates">
                          {cert.issueDate && <span>Issued: {formatDate(cert.issueDate)}</span>}
                          {cert.expiryDate && <span> • Expires: {formatDate(cert.expiryDate)}</span>}
                          {cert.credentialId && <span> • ID: {cert.credentialId}</span>}
                        </div>
                      </div>
                      <div className="cert-actions">
                        {cert.credentialUrl && (
                          <a
                            href={cert.credentialUrl}
                            target="_blank"
                            rel="noreferrer noopener"
                            className="btn-icon"
                            title="Verify credential"
                          >
                            <ExternalLink size={14} />
                          </a>
                        )}
                        <button
                          type="button"
                          className="btn-icon"
                          onClick={() => openModal('certification', cert, idx)}
                          aria-label="Edit certification"
                        >
                          <Edit2 size={14} />
                        </button>
                        <button
                          type="button"
                          className="btn-icon text-danger"
                          onClick={() => handleDeleteItem('certifications', idx)}
                          aria-label="Delete certification"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
        )}

        {/* ================= CANDIDATE JOB PREFERENCES TAB ================= */}
        {!isRecruiter && activeTab === 'preferences' && (
          <div className="profile-section-group">
            <div className="profile-section-card">
              <h2 className="section-card-title">Job & Career Preferences</h2>
              <p className="section-card-desc">
                Define your ideal job roles, preferred work locations in India, workplace flexibility, and INR compensation expectations.
              </p>

              {/* 1. Target Job Roles */}
              <div className="form-group mb-6">
                <label className="font-semibold text-main mb-1">
                  Desired Job Roles ({profileData.jobPreferences?.desiredRoles?.length || 0})
                </label>
                <p className="text-muted text-xs mb-2">
                  Add target job titles you want recruiters to consider you for.
                </p>

                <div className="skill-input-bar">
                  <input
                    type="text"
                    className="form-input flex-1"
                    placeholder="e.g. Senior Frontend Engineer, React Developer..."
                    value={newRoleInput}
                    onChange={(e) => setNewRoleInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddDesiredRole();
                      }
                    }}
                  />
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={() => handleAddDesiredRole()}
                    disabled={!newRoleInput.trim()}
                  >
                    <Plus size={16} />
                    <span>Add Role</span>
                  </button>
                </div>

                {/* Selected Roles Badges */}
                <div className="profile-skills-box mb-4">
                  <span className="skills-box-label">Your Target Roles:</span>
                  {(profileData.jobPreferences?.desiredRoles || []).length === 0 ? (
                    <p className="empty-state-text">No target roles specified yet. Add your preferred job titles above.</p>
                  ) : (
                    <div className="skills-badge-list">
                      {profileData.jobPreferences.desiredRoles.map((role) => (
                        <span key={role} className="skill-chip">
                          <span>{role}</span>
                          <button
                            type="button"
                            className="skill-chip-remove"
                            onClick={() => handleRemoveDesiredRole(role)}
                            aria-label={`Remove role ${role}`}
                          >
                            <X size={12} />
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Popular Role Quick Suggestions */}
                <div className="suggested-skills-box">
                  <span className="skills-box-label">Quick Suggestions:</span>
                  <div className="suggested-badges">
                    {POPULAR_ROLE_SUGGESTIONS.filter(
                      (r) => !(profileData.jobPreferences?.desiredRoles || []).some(
                        (existing) => existing.toLowerCase() === r.toLowerCase()
                      )
                    ).map((r) => (
                      <button
                        key={r}
                        type="button"
                        className="suggested-chip"
                        onClick={() => handleAddDesiredRole(r)}
                      >
                        <Plus size={12} />
                        <span>{r}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* 2. Preferred Indian Cities */}
              <div className="form-group mb-6">
                <label className="font-semibold text-main mb-1">
                  Preferred Indian Work Locations ({profileData.jobPreferences?.preferredCities?.length || 0})
                </label>
                <p className="text-muted text-xs mb-2">
                  Select or type the Indian cities or regions where you prefer to work.
                </p>

                <div className="skill-input-bar">
                  <input
                    type="text"
                    list="pref-indian-cities-list"
                    className="form-input flex-1"
                    placeholder="e.g. Bengaluru, Hyderabad, Pune, Mumbai, Delhi NCR..."
                    value={newCityInput}
                    onChange={(e) => setNewCityInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddPreferredCity();
                      }
                    }}
                  />
                  <datalist id="pref-indian-cities-list">
                    {INDIAN_CITIES.map((c) => (
                      <option key={c} value={c} />
                    ))}
                  </datalist>
                  <button
                    type="button"
                    className="btn btn-outline"
                    onClick={() => handleAddPreferredCity()}
                    disabled={!newCityInput.trim()}
                  >
                    <Plus size={16} />
                    <span>Add City</span>
                  </button>
                </div>

                {/* Selected Cities Badges */}
                <div className="profile-skills-box mb-4">
                  <span className="skills-box-label">Selected Cities:</span>
                  {(profileData.jobPreferences?.preferredCities || []).length === 0 ? (
                    <p className="empty-state-text">No cities added yet. Add your preferred Indian cities above.</p>
                  ) : (
                    <div className="skills-badge-list">
                      {profileData.jobPreferences.preferredCities.map((city) => (
                        <span key={city} className="skill-chip">
                          <MapPin size={12} />
                          <span>{city}</span>
                          <button
                            type="button"
                            className="skill-chip-remove"
                            onClick={() => handleRemovePreferredCity(city)}
                            aria-label={`Remove city ${city}`}
                          >
                            <X size={12} />
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Popular Indian Hubs */}
                <div className="suggested-skills-box">
                  <span className="skills-box-label">Popular Hubs:</span>
                  <div className="suggested-badges">
                    {POPULAR_INDIAN_HUBS.filter(
                      (h) => !(profileData.jobPreferences?.preferredCities || []).some(
                        (existing) => existing.toLowerCase() === h.toLowerCase()
                      )
                    ).map((h) => (
                      <button
                        key={h}
                        type="button"
                        className="suggested-chip"
                        onClick={() => handleAddPreferredCity(h)}
                      >
                        <Plus size={12} />
                        <span>{h}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* 3. Workplace Environment Preference */}
              <div className="form-group mb-6">
                <label className="font-semibold text-main mb-1">Workplace Environment</label>
                <p className="text-muted text-xs mb-2">
                  Select your primary work model preference.
                </p>
                <div className="pref-options-grid">
                  {WORKPLACE_OPTIONS.map((opt) => {
                    const isSelected = (profileData.jobPreferences?.workplaceType || 'any') === opt.id;
                    return (
                      <div
                        key={opt.id}
                        className={`pref-option-card ${isSelected ? 'selected' : ''}`}
                        onClick={() => handlePrefChange('workplaceType', opt.id)}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            handlePrefChange('workplaceType', opt.id);
                          }
                        }}
                      >
                        <div className="pref-option-title">
                          <span>{opt.label}</span>
                          {isSelected && <Check size={16} className="text-primary" />}
                        </div>
                        <p className="pref-option-desc">{opt.desc}</p>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* 4. Expected Salary in INR */}
              <div className="form-group mb-6">
                <label className="font-semibold text-main mb-1">
                  Expected Annual Compensation (INR in LPA)
                </label>
                <p className="text-muted text-xs mb-2">
                  Specify your desired salary range in Lakhs Per Annum (LPA). Transparent salary expectations help recruiters fast-track your applications.
                </p>

                <div className="form-grid">
                  <div className="form-group">
                    <label htmlFor="pref-salary-min">Minimum Expected (LPA)</label>
                    <div className="salary-input-wrap">
                      <span className="salary-currency-symbol">₹</span>
                      <input
                        id="pref-salary-min"
                        type="number"
                        min="0"
                        max="200"
                        step="0.5"
                        className="form-input"
                        placeholder="e.g. 8"
                        value={profileData.jobPreferences?.expectedSalary?.min ?? ''}
                        onChange={(e) => handleSalaryChange('min', e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="form-group">
                    <label htmlFor="pref-salary-max">Maximum / Target Expected (LPA)</label>
                    <div className="salary-input-wrap">
                      <span className="salary-currency-symbol">₹</span>
                      <input
                        id="pref-salary-max"
                        type="number"
                        min="0"
                        max="200"
                        step="0.5"
                        className="form-input"
                        placeholder="e.g. 15"
                        value={profileData.jobPreferences?.expectedSalary?.max ?? ''}
                        onChange={(e) => handleSalaryChange('max', e.target.value)}
                      />
                    </div>
                  </div>
                </div>

                {/* Live Preview Pill */}
                {(profileData.jobPreferences?.expectedSalary?.min || profileData.jobPreferences?.expectedSalary?.max) && (
                  <div className="salary-preview-tag">
                    <IndianRupee size={14} />
                    <span>
                      Expected Range:{' '}
                      {profileData.jobPreferences?.expectedSalary?.min
                        ? `₹${profileData.jobPreferences.expectedSalary.min}`
                        : 'Flexible'}{' '}
                      –{' '}
                      {profileData.jobPreferences?.expectedSalary?.max
                        ? `₹${profileData.jobPreferences.expectedSalary.max} LPA`
                        : 'Open'}
                    </span>
                  </div>
                )}
              </div>

              {/* 5. Preferred Employment Types */}
              <div className="form-group">
                <label className="font-semibold text-main mb-1">Preferred Employment Types</label>
                <div className="employment-checkboxes-row">
                  {EMPLOYMENT_TYPE_CHOICES.map((type) => {
                    const isChecked = (profileData.jobPreferences?.employmentTypes || []).includes(type);
                    return (
                      <label
                        key={type}
                        className={`checkbox-pill-label ${isChecked ? 'checked' : ''}`}
                      >
                        <input
                          type="checkbox"
                          className="sr-only"
                          checked={isChecked}
                          onChange={() => handleToggleEmploymentType(type)}
                        />
                        {isChecked ? <Check size={14} /> : null}
                        <span>{type}</span>
                      </label>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ================= CANDIDATE RESUME TAB ================= */}
        {!isRecruiter && activeTab === 'resume' && (
          <div className="profile-section-card">
            <h2 className="section-card-title">Resume & CV Document</h2>
            <p className="section-card-desc">
              Attach your ATS-ready resume. Supported formats include PDF, DOC, and DOCX (Max 5 MB).
            </p>

              {profileData.resume?.originalName ? (
                <div className="resume-attached-card">
                  <div className="resume-icon-badge">
                    <FileText size={28} className="text-primary" />
                  </div>
                  <div className="resume-file-info">
                    <h3 className="resume-file-name">{profileData.resume.originalName}</h3>
                    <p className="resume-meta">
                      Size: {formatBytes(profileData.resume.sizeBytes)} • Uploaded:{' '}
                      {formatDate(profileData.resume.uploadedAt)}
                    </p>
                  </div>
                  <div className="resume-actions-group">
                    <button
                      type="button"
                      className="btn btn-outline btn-sm"
                      onClick={handleDownloadResume}
                      disabled={isDownloadingResume}
                    >
                      {isDownloadingResume ? (
                        <>
                          <RefreshCw size={14} className="spin-icon" />
                          <span>Downloading...</span>
                        </>
                      ) : (
                        <>
                          <Download size={14} />
                          <span>View / Download</span>
                        </>
                      )}
                    </button>
                    <label className="btn btn-outline btn-sm cursor-pointer">
                      <Upload size={14} />
                      <span>Replace</span>
                      <input
                        type="file"
                        accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                        className="sr-only"
                        onChange={handleResumeFileSelect}
                        disabled={isSaving}
                      />
                    </label>
                    <button
                      type="button"
                      className="btn btn-ghost btn-sm text-danger"
                      onClick={handleDeleteResume}
                      disabled={isSaving}
                    >
                      <Trash2 size={14} />
                      <span>Remove</span>
                    </button>
                  </div>
                </div>
              ) : (
                <div className="resume-drop-zone">
                  <FileText size={42} className="text-secondary" />
                  <h3>Upload your resume</h3>
                  <p>Drag and drop or select your resume file (.PDF, .DOC, or .DOCX)</p>
                  <label className="btn btn-primary cursor-pointer mt-3">
                    <Upload size={16} />
                    <span>Select Resume File</span>
                    <input
                      type="file"
                      accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                      className="sr-only"
                      onChange={handleResumeFileSelect}
                      disabled={isSaving}
                    />
                  </label>
                  <span className="file-limit-note">Maximum size: 5 MB</span>
                </div>
              )}
          </div>
        )}
      </div>

      {/* ================= SUB-ITEM MODAL (Education / Experience / Project / Certification) ================= */}
      {modalType && (
        <div className="profile-modal-backdrop" onClick={closeModal} role="dialog" aria-modal="true">
          <div className="profile-modal-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">
                {editingItemIndex !== null ? 'Edit' : 'Add'} {modalType.charAt(0).toUpperCase() + modalType.slice(1)}
              </h2>
              <button type="button" className="modal-close-btn" onClick={closeModal} aria-label="Close modal">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveModalItem} className="modal-form">
              {/* Education Form */}
              {modalType === 'education' && (
                <>
                  <div className="form-group">
                    <label>Institution / College / University <span className="text-danger">*</span></label>
                    <input
                      type="text"
                      className="form-input"
                      value={modalFormData.institution || ''}
                      onChange={(e) => setModalFormData({ ...modalFormData, institution: e.target.value })}
                      required
                      placeholder="e.g. IIT Bombay, BITS Pilani, NIT Trichy, or Anna University"
                    />
                  </div>
                  <div className="form-grid">
                    <div className="form-group">
                      <label>Degree / Qualification (Indian Formats Supported)</label>
                      <input
                        type="text"
                        list="indian-degrees-list"
                        className="form-input"
                        value={modalFormData.degree || ''}
                        onChange={(e) => setModalFormData({ ...modalFormData, degree: e.target.value })}
                        placeholder="e.g. B.Tech / B.E., MCA, MBA"
                      />
                      <datalist id="indian-degrees-list">
                        {INDIAN_DEGREES.map((d) => (
                          <option key={d} value={d} />
                        ))}
                      </datalist>
                    </div>
                    <div className="form-group">
                      <label>Field of Study / Branch</label>
                      <input
                        type="text"
                        className="form-input"
                        value={modalFormData.fieldOfStudy || ''}
                        onChange={(e) => setModalFormData({ ...modalFormData, fieldOfStudy: e.target.value })}
                        placeholder="e.g. Computer Science & Engineering"
                      />
                    </div>
                  </div>
                  <div className="form-grid">
                    <div className="form-group">
                      <label>Start Year <span className="text-danger">*</span></label>
                      <input
                        type="number"
                        min="1970"
                        max="2035"
                        className="form-input"
                        value={modalFormData.startYear || ''}
                        onChange={(e) => setModalFormData({ ...modalFormData, startYear: e.target.value })}
                        placeholder="e.g. 2020"
                        required
                      />
                    </div>
                    <div className="form-group">
                      <label>Graduation Year / End Year</label>
                      <input
                        type="number"
                        min="1970"
                        max="2035"
                        className="form-input"
                        value={modalFormData.endYear || ''}
                        onChange={(e) => setModalFormData({ ...modalFormData, endYear: e.target.value })}
                        placeholder="e.g. 2024"
                        disabled={modalFormData.current}
                      />
                    </div>
                  </div>
                  <div className="form-group checkbox-row">
                    <label className="checkbox-label">
                      <input
                        type="checkbox"
                        checked={Boolean(modalFormData.current)}
                        onChange={(e) => setModalFormData({ ...modalFormData, current: e.target.checked })}
                      />
                      <span>Currently studying here</span>
                    </label>
                  </div>
                  <div className="form-group">
                    <label>Description / Activities</label>
                    <textarea
                      rows={3}
                      className="form-textarea"
                      value={modalFormData.description || ''}
                      onChange={(e) => setModalFormData({ ...modalFormData, description: e.target.value })}
                      placeholder="e.g. Relevant coursework, honors, GPA..."
                    />
                  </div>
                </>
              )}

              {/* Experience Form */}
              {modalType === 'experience' && (
                <>
                  <div className="form-grid">
                    <div className="form-group">
                      <label>Company Name <span className="text-danger">*</span></label>
                      <input
                        type="text"
                        className="form-input"
                        value={modalFormData.company || ''}
                        onChange={(e) => setModalFormData({ ...modalFormData, company: e.target.value })}
                        required
                        placeholder="e.g. Swiggy, Infosys, Flipkart, or Tech Startup"
                      />
                    </div>
                    <div className="form-group">
                      <label>Job Title <span className="text-danger">*</span></label>
                      <input
                        type="text"
                        className="form-input"
                        value={modalFormData.title || ''}
                        onChange={(e) => setModalFormData({ ...modalFormData, title: e.target.value })}
                        required
                        placeholder="e.g. Full-Stack Engineer"
                      />
                    </div>
                  </div>
                  <div className="form-group">
                    <label>Location (Indian City / Remote)</label>
                    <input
                      type="text"
                      list="profile-indian-cities"
                      className="form-input"
                      value={modalFormData.location || ''}
                      onChange={(e) => setModalFormData({ ...modalFormData, location: e.target.value })}
                      placeholder="e.g. Bengaluru, Karnataka or Remote"
                    />
                  </div>
                  <div className="form-grid">
                    <div className="form-group">
                      <label>Start Date</label>
                      <input
                        type="date"
                        className="form-input"
                        value={modalFormData.startDate ? modalFormData.startDate.substring(0, 10) : ''}
                        onChange={(e) => setModalFormData({ ...modalFormData, startDate: e.target.value })}
                      />
                    </div>
                    <div className="form-group">
                      <label>End Date</label>
                      <input
                        type="date"
                        className="form-input"
                        value={modalFormData.endDate ? modalFormData.endDate.substring(0, 10) : ''}
                        onChange={(e) => setModalFormData({ ...modalFormData, endDate: e.target.value })}
                        disabled={modalFormData.current}
                      />
                    </div>
                  </div>
                  <div className="form-group checkbox-row">
                    <label className="checkbox-label">
                      <input
                        type="checkbox"
                        checked={Boolean(modalFormData.current)}
                        onChange={(e) => setModalFormData({ ...modalFormData, current: e.target.checked })}
                      />
                      <span>I currently work in this role</span>
                    </label>
                  </div>
                  <div className="form-group">
                    <label>Responsibilities & Achievements</label>
                    <textarea
                      rows={4}
                      className="form-textarea"
                      value={modalFormData.description || ''}
                      onChange={(e) => setModalFormData({ ...modalFormData, description: e.target.value })}
                      placeholder="Describe your impact, tools used, and key milestones achieved..."
                    />
                  </div>
                </>
              )}

              {/* Project Form */}
              {modalType === 'project' && (
                <>
                  <div className="form-group">
                    <label>Project Title <span className="text-danger">*</span></label>
                    <input
                      type="text"
                      className="form-input"
                      value={modalFormData.title || ''}
                      onChange={(e) => setModalFormData({ ...modalFormData, title: e.target.value })}
                      required
                      placeholder="e.g. CareerPulse ATS Engine"
                    />
                  </div>
                  <div className="form-group">
                    <label>Project Link / URL</label>
                    <input
                      type="url"
                      className="form-input"
                      value={modalFormData.link || ''}
                      onChange={(e) => setModalFormData({ ...modalFormData, link: e.target.value })}
                      placeholder="https://github.com/..."
                    />
                  </div>
                  <div className="form-group">
                    <label>Technologies Used (comma separated)</label>
                    <input
                      type="text"
                      className="form-input"
                      value={
                        Array.isArray(modalFormData.technologies)
                          ? modalFormData.technologies.join(', ')
                          : modalFormData.technologies || ''
                      }
                      onChange={(e) => setModalFormData({ ...modalFormData, technologies: e.target.value })}
                      placeholder="React, TypeScript, Node.js, Tailwind"
                    />
                  </div>
                  <div className="form-group">
                    <label>Project Description</label>
                    <textarea
                      rows={4}
                      className="form-textarea"
                      value={modalFormData.description || ''}
                      onChange={(e) => setModalFormData({ ...modalFormData, description: e.target.value })}
                      placeholder="Briefly explain the goal, architecture, and results of this project..."
                    />
                  </div>
                </>
              )}

              {/* Certification Form */}
              {modalType === 'certification' && (
                <>
                  <div className="form-group">
                    <label>Certification Name <span className="text-danger">*</span></label>
                    <input
                      type="text"
                      className="form-input"
                      value={modalFormData.name || ''}
                      onChange={(e) => setModalFormData({ ...modalFormData, name: e.target.value })}
                      required
                      placeholder="e.g. AWS Certified Solutions Architect"
                    />
                  </div>
                  <div className="form-group">
                    <label>Issuing Organization <span className="text-danger">*</span></label>
                    <input
                      type="text"
                      className="form-input"
                      value={modalFormData.issuingOrganization || ''}
                      onChange={(e) => setModalFormData({ ...modalFormData, issuingOrganization: e.target.value })}
                      required
                      placeholder="e.g. Amazon Web Services (AWS)"
                    />
                  </div>
                  <div className="form-grid">
                    <div className="form-group">
                      <label>Issue Date</label>
                      <input
                        type="date"
                        className="form-input"
                        value={modalFormData.issueDate ? modalFormData.issueDate.substring(0, 10) : ''}
                        onChange={(e) => setModalFormData({ ...modalFormData, issueDate: e.target.value })}
                      />
                    </div>
                    <div className="form-group">
                      <label>Expiry Date</label>
                      <input
                        type="date"
                        className="form-input"
                        value={modalFormData.expiryDate ? modalFormData.expiryDate.substring(0, 10) : ''}
                        onChange={(e) => setModalFormData({ ...modalFormData, expiryDate: e.target.value })}
                      />
                    </div>
                  </div>
                  <div className="form-grid">
                    <div className="form-group">
                      <label>Credential ID</label>
                      <input
                        type="text"
                        className="form-input"
                        value={modalFormData.credentialId || ''}
                        onChange={(e) => setModalFormData({ ...modalFormData, credentialId: e.target.value })}
                        placeholder="e.g. AWS-987654"
                      />
                    </div>
                    <div className="form-group">
                      <label>Verification URL</label>
                      <input
                        type="url"
                        className="form-input"
                        value={modalFormData.credentialUrl || ''}
                        onChange={(e) => setModalFormData({ ...modalFormData, credentialUrl: e.target.value })}
                        placeholder="https://credly.com/..."
                      />
                    </div>
                  </div>
                </>
              )}

              <div className="modal-actions">
                <button type="button" className="btn btn-ghost" onClick={closeModal}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  {editingItemIndex !== null ? 'Save Changes' : 'Add Item'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Profile Photo Cropper Modal */}
      <AvatarCropModal
        isOpen={isCropModalOpen}
        imageSrc={selectedCropImage}
        onClose={handleCloseCropModal}
        onApply={handleApplyCroppedAvatar}
        onChangeImage={() => avatarFileInputRef.current?.click()}
      />
    </div>
  );
}
