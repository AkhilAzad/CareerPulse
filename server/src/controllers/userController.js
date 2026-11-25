const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const { User } = require('../models');

const RESUME_STORAGE_DIR = path.resolve(__dirname, '../../storage/resumes');
const AVATAR_STORAGE_DIR = path.resolve(__dirname, '../../storage/avatars');

const ensureResumeDirectory = (subDir = '') => {
  const targetDir = subDir ? path.join(RESUME_STORAGE_DIR, subDir) : RESUME_STORAGE_DIR;
  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }
  return targetDir;
};

const ensureAvatarDirectory = (subDir = '') => {
  const targetDir = subDir ? path.join(AVATAR_STORAGE_DIR, subDir) : AVATAR_STORAGE_DIR;
  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }
  return targetDir;
};

/**
 * @route   GET /api/users/profile
 * @desc    Get currently authenticated user's profile
 * @access  Private (Authenticated)
 */
const getProfile = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        status: 404,
        message: 'User profile not found.',
      });
    }

    return res.status(200).json({
      success: true,
      status: 200,
      data: user.toSafeObject ? user.toSafeObject() : user,
    });
  } catch (error) {
    return next(error);
  }
};

/**
 * @route   PATCH /api/users/profile
 * @desc    Update permitted fields of the authenticated user's profile
 * @access  Private (Authenticated)
 */
const updateProfile = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        status: 404,
        message: 'User profile not found.',
      });
    }

    const {
      name,
      profile,
      skills,
      education,
      experience,
      projects,
      certifications,
      resume,
      jobPreferences,
    } = req.body || {};

    // 1. Name validation & update
    if (name !== undefined) {
      if (typeof name !== 'string' || name.trim().length < 2 || name.trim().length > 100) {
        return res.status(400).json({
          success: false,
          status: 400,
          message: 'Name must be between 2 and 100 characters long.',
        });
      }
      user.name = name.trim();
    }

    // 2. Profile subdocument update (whitelisted fields only)
    if (profile && typeof profile === 'object') {
      const allowedProfileFields = [
        'headline',
        'bio',
        'phone',
        'location',
        'avatarUrl',
        'website',
        'portfolio',
        'github',
        'linkedin',
        'twitter',
        'company',
        'companyWebsite',
        'companyDescription',
        'industry',
        'companySize',
        'companyLogo',
        'headquarters',
        'companyRegistration',
      ];

      user.profile = user.profile || {};
      allowedProfileFields.forEach((field) => {
        if (profile[field] !== undefined) {
          if (field === 'avatarUrl') {
            const val = typeof profile[field] === 'string' ? profile[field].trim() : '';
            // Only accept empty string or safe internal API avatar paths
            if (!val) {
              user.profile[field] = '';
            } else if (val.startsWith('/api/users/')) {
              user.profile[field] = val;
            } else if (val.includes('/api/users/')) {
              const match = val.match(/\/api\/users\/[^\s]+/);
              if (match) {
                user.profile[field] = match[0];
              }
            }
          } else {
            user.profile[field] =
              typeof profile[field] === 'string' ? profile[field].trim() : profile[field];
          }
        }
      });

      // If registration info is submitted, mark verification as pending review
      if (profile.companyRegistration && user.profile.verificationStatus === 'unverified') {
        user.profile.verificationStatus = 'pending';
      }
    }

    // 3. Skills array update
    if (skills !== undefined) {
      if (Array.isArray(skills)) {
        user.skills = skills
          .map((s) => (typeof s === 'string' ? s.trim().toLowerCase() : ''))
          .filter(Boolean);
      } else if (typeof skills === 'string') {
        user.skills = skills
          .split(',')
          .map((s) => s.trim().toLowerCase())
          .filter(Boolean);
      }
    }

    // 4. Education array update
    if (education !== undefined) {
      if (!Array.isArray(education)) {
        return res.status(400).json({
          success: false,
          status: 400,
          message: 'Education must be an array of education entries.',
        });
      }
      user.education = education;
    }

    // 5. Experience array update
    if (experience !== undefined) {
      if (!Array.isArray(experience)) {
        return res.status(400).json({
          success: false,
          status: 400,
          message: 'Experience must be an array of work experience entries.',
        });
      }
      user.experience = experience;
    }

    // 6. Projects array update
    if (projects !== undefined) {
      if (!Array.isArray(projects)) {
        return res.status(400).json({
          success: false,
          status: 400,
          message: 'Projects must be an array of project entries.',
        });
      }
      user.projects = projects;
    }

    // 7. Certifications array update
    if (certifications !== undefined) {
      if (!Array.isArray(certifications)) {
        return res.status(400).json({
          success: false,
          status: 400,
          message: 'Certifications must be an array of certification entries.',
        });
      }
      user.certifications = certifications;
    }

    // 8. Resume metadata update
    if (resume !== undefined) {
      if (resume === null) {
        user.resume = null;
      } else if (typeof resume === 'object' && resume.storageKey) {
        user.resume = {
          originalName: resume.originalName?.trim() || 'Resume.pdf',
          storageKey: resume.storageKey.trim(),
          mimeType: resume.mimeType || 'application/pdf',
          sizeBytes: Number(resume.sizeBytes) || 0,
          uploadedAt: new Date(),
        };
      }
    }

    // 9. Job Preferences update
    if (jobPreferences !== undefined) {
      if (typeof jobPreferences !== 'object' || jobPreferences === null || Array.isArray(jobPreferences)) {
        return res.status(400).json({
          success: false,
          status: 400,
          message: 'Job preferences must be an object.',
        });
      }

      user.jobPreferences = user.jobPreferences || {};

      if (jobPreferences.desiredRoles !== undefined) {
        if (!Array.isArray(jobPreferences.desiredRoles)) {
          return res.status(400).json({
            success: false,
            status: 400,
            message: 'Desired roles must be an array of strings.',
          });
        }
        user.jobPreferences.desiredRoles = jobPreferences.desiredRoles
          .map((r) => (typeof r === 'string' ? r.trim() : ''))
          .filter(Boolean);
      }

      if (jobPreferences.preferredCities !== undefined) {
        if (!Array.isArray(jobPreferences.preferredCities)) {
          return res.status(400).json({
            success: false,
            status: 400,
            message: 'Preferred cities must be an array of strings.',
          });
        }
        user.jobPreferences.preferredCities = jobPreferences.preferredCities
          .map((c) => (typeof c === 'string' ? c.trim() : ''))
          .filter(Boolean);
      }

      if (jobPreferences.workplaceType !== undefined) {
        const allowedWorkplaces = ['any', 'remote', 'hybrid', 'on-site'];
        if (!allowedWorkplaces.includes(jobPreferences.workplaceType)) {
          return res.status(400).json({
            success: false,
            status: 400,
            message: 'Workplace type must be one of: any, remote, hybrid, on-site.',
          });
        }
        user.jobPreferences.workplaceType = jobPreferences.workplaceType;
      }

      if (jobPreferences.expectedSalary !== undefined) {
        if (typeof jobPreferences.expectedSalary !== 'object' || jobPreferences.expectedSalary === null) {
          return res.status(400).json({
            success: false,
            status: 400,
            message: 'Expected salary must be an object with min and max numbers.',
          });
        }
        const { min, max, currency } = jobPreferences.expectedSalary;
        const numMin = min !== undefined && min !== '' && min !== null ? Number(min) : null;
        const numMax = max !== undefined && max !== '' && max !== null ? Number(max) : null;

        if (numMin !== null && (isNaN(numMin) || numMin < 0)) {
          return res.status(400).json({
            success: false,
            status: 400,
            message: 'Minimum expected salary must be a positive number.',
          });
        }
        if (numMax !== null && (isNaN(numMax) || numMax < 0)) {
          return res.status(400).json({
            success: false,
            status: 400,
            message: 'Maximum expected salary must be a positive number.',
          });
        }
        if (numMin !== null && numMax !== null && numMax < numMin) {
          return res.status(400).json({
            success: false,
            status: 400,
            message: 'Maximum expected salary cannot be less than minimum.',
          });
        }

        user.jobPreferences.expectedSalary = {
          min: numMin,
          max: numMax,
          currency: (currency && typeof currency === 'string') ? currency.trim() : 'INR',
        };
      }

      if (jobPreferences.employmentTypes !== undefined) {
        if (Array.isArray(jobPreferences.employmentTypes)) {
          user.jobPreferences.employmentTypes = jobPreferences.employmentTypes
            .map((t) => (typeof t === 'string' ? t.trim() : ''))
            .filter(Boolean);
        }
      }
    }

    // Persist changes to MongoDB
    await user.save();

    return res.status(200).json({
      success: true,
      status: 200,
      message: 'Profile updated successfully.',
      data: user.toSafeObject ? user.toSafeObject() : user,
    });
  } catch (error) {
    return next(error);
  }
};

/**
 * @route   POST /api/users/resume
 * @desc    Save secure resume file and metadata for authenticated candidate
 * @access  Private (Candidate)
 */
const uploadResume = async (req, res, next) => {
  try {
    const { originalName, storageKey, mimeType, sizeBytes, fileData } = req.body || {};

    if (!originalName || typeof originalName !== 'string') {
      return res.status(400).json({
        success: false,
        status: 400,
        message: 'Resume originalName is required.',
      });
    }

    // Validate file extension
    const ext = path.extname(originalName).toLowerCase();
    const allowedExtensions = ['.pdf', '.doc', '.docx'];

    if (!allowedExtensions.includes(ext)) {
      return res.status(400).json({
        success: false,
        status: 400,
        message: 'Invalid resume file type. Allowed formats: PDF, DOC, DOCX.',
      });
    }

    const MAX_RESUME_SIZE = 5 * 1024 * 1024; // 5 MB
    const parsedSizeBytes = Number(sizeBytes) || (fileData ? Math.round((fileData.length * 3) / 4) : 102400);
    if (parsedSizeBytes > MAX_RESUME_SIZE) {
      return res.status(400).json({
        success: false,
        status: 400,
        message: 'Resume file size exceeds the 5 MB limit.',
      });
    }

    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        status: 404,
        message: 'User not found.',
      });
    }

    // Secure sanitized filename and storage key
    const sanitizedBase = path.basename(originalName).replace(/[^a-zA-Z0-9._-]/g, '_');
    const uniqueFileName = `${Date.now()}-${sanitizedBase}`;
    const safeKey = storageKey || `resumes/${user._id}/${uniqueFileName}`;

    // If fileData (base64 string) is provided, write to secure private disk storage
    if (fileData && typeof fileData === 'string') {
      const base64Content = fileData.includes(';base64,')
        ? fileData.split(';base64,').pop()
        : fileData;
      const buffer = Buffer.from(base64Content, 'base64');

      const userDir = ensureResumeDirectory(user._id.toString());
      const filePath = path.join(userDir, uniqueFileName);

      // Clean up previous disk file if present
      if (user.resume && user.resume.storageKey) {
        try {
          const oldFilePath = path.resolve(__dirname, '../../storage', user.resume.storageKey);
          if (fs.existsSync(oldFilePath)) {
            fs.unlinkSync(oldFilePath);
          }
        } catch (_) {}
      }

      fs.writeFileSync(filePath, buffer);
    }

    user.resume = {
      originalName: originalName.trim(),
      storageKey: safeKey,
      mimeType: mimeType || (ext === '.pdf' ? 'application/pdf' : 'application/octet-stream'),
      sizeBytes: parsedSizeBytes,
      uploadedAt: new Date(),
    };

    await user.save();

    return res.status(200).json({
      success: true,
      status: 200,
      message: 'Resume metadata stored securely.',
      data: user.resume,
    });
  } catch (error) {
    return next(error);
  }
};

/**
 * @route   DELETE /api/users/resume
 * @desc    Remove stored resume metadata and local file for authenticated user
 * @access  Private (Authenticated)
 */
const deleteResume = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        status: 404,
        message: 'User not found.',
      });
    }

    // Clean up local disk file if exists
    if (user.resume && user.resume.storageKey) {
      try {
        const filePath = path.resolve(__dirname, '../../storage', user.resume.storageKey);
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      } catch (_) {}
    }

    user.resume = null;
    await user.save();

    return res.status(200).json({
      success: true,
      status: 200,
      message: 'Resume removed successfully.',
    });
  } catch (error) {
    return next(error);
  }
};

/**
 * @route   GET /api/users/resume/download
 * @desc    Securely download/stream the authenticated user's resume
 * @access  Private (Authenticated)
 */
const downloadResume = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        status: 404,
        message: 'User not found.',
      });
    }

    if (!user.resume || !user.resume.storageKey) {
      return res.status(404).json({
        success: false,
        status: 404,
        message: 'No resume attached to this profile.',
      });
    }

    const filePath = path.resolve(__dirname, '../../storage', user.resume.storageKey);

    // If file exists on private disk storage, stream it safely
    if (fs.existsSync(filePath)) {
      res.setHeader('Content-Type', user.resume.mimeType || 'application/pdf');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="${encodeURIComponent(user.resume.originalName)}"`
      );
      const fileStream = fs.createReadStream(filePath);
      return fileStream.pipe(res);
    }

    // Development fallback: if only metadata exists (e.g. from tests or simulated storage),
    // return a clean structured document representing candidate profile & resume reference
    const fallbackContent = [
      `CareerPulse ATS - Candidate Profile & Resume`,
      `===========================================`,
      `Name: ${user.name}`,
      `Email: ${user.email}`,
      `Headline: ${user.profile?.headline || 'N/A'}`,
      `Location: ${user.profile?.location || 'N/A'}`,
      `Phone: ${user.profile?.phone || 'N/A'}`,
      ``,
      `Attached Resume Metadata:`,
      `File Name: ${user.resume.originalName}`,
      `MIME Type: ${user.resume.mimeType}`,
      `Size: ${user.resume.sizeBytes} bytes`,
      `Uploaded At: ${user.resume.uploadedAt}`,
      `Storage Key: ${user.resume.storageKey}`,
    ].join('\n');

    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${encodeURIComponent(user.resume.originalName.replace(/\.[^.]+$/, '.txt'))}"`
    );
    return res.send(fallbackContent);
  } catch (error) {
    return next(error);
  }
};

/**
 * @route   POST /api/users/avatar
 * @desc    Upload profile photo (JPG, JPEG, PNG, WebP up to 2MB)
 * @access  Private (Authenticated)
 */
const uploadAvatar = async (req, res, next) => {
  try {
    const { fileData, originalName, mimeType, sizeBytes } = req.body || {};

    if (!fileData || typeof fileData !== 'string') {
      return res.status(400).json({
        success: false,
        status: 400,
        message: 'Image file data is required.',
      });
    }

    const safeOriginalName = originalName || 'avatar.png';
    const ext = path.extname(safeOriginalName).toLowerCase() || (mimeType === 'image/jpeg' ? '.jpg' : '.png');
    const allowedExtensions = ['.jpg', '.jpeg', '.png', '.webp'];
    const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/webp'];

    if (!allowedExtensions.includes(ext) || (mimeType && !allowedMimeTypes.includes(mimeType))) {
      return res.status(400).json({
        success: false,
        status: 400,
        message: 'Invalid photo format. Only JPG, JPEG, PNG, and WebP images are supported.',
      });
    }

    const MAX_AVATAR_SIZE = 2 * 1024 * 1024; // 2 MB
    const parsedSizeBytes = Number(sizeBytes) || Math.round((fileData.length * 3) / 4);
    if (parsedSizeBytes > MAX_AVATAR_SIZE) {
      return res.status(400).json({
        success: false,
        status: 400,
        message: 'Profile photo size must be less than 2 MB.',
      });
    }

    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        status: 404,
        message: 'User not found.',
      });
    }

    // Decode base64
    const base64Content = fileData.includes(';base64,')
      ? fileData.split(';base64,').pop()
      : fileData;
    const buffer = Buffer.from(base64Content, 'base64');

    if (buffer.length > MAX_AVATAR_SIZE) {
      return res.status(400).json({
        success: false,
        status: 400,
        message: 'Profile photo size must be less than 2 MB.',
      });
    }

    const userDir = ensureAvatarDirectory(user._id.toString());

    // Clean up previous avatar in user's directory
    try {
      const existingFiles = fs.readdirSync(userDir);
      for (const file of existingFiles) {
        fs.unlinkSync(path.join(userDir, file));
      }
    } catch (_) {}

    const fileName = `avatar-${Date.now()}${ext}`;
    const filePath = path.join(userDir, fileName);
    fs.writeFileSync(filePath, buffer);

    // Save safe API relative URL against user's profile
    const avatarUrl = `/api/users/${user._id}/avatar?t=${Date.now()}`;
    user.profile = user.profile || {};
    user.profile.avatarUrl = avatarUrl;
    await user.save();

    return res.status(200).json({
      success: true,
      status: 200,
      message: 'Profile photo uploaded successfully.',
      data: {
        avatarUrl,
      },
    });
  } catch (error) {
    return next(error);
  }
};

/**
 * @route   GET /api/users/:id/avatar
 * @desc    Serve user profile avatar image with initials fallback
 * @access  Public
 */
const getAvatar = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        status: 400,
        message: 'Invalid user ID.',
      });
    }

    const userDir = path.join(AVATAR_STORAGE_DIR, id.toString());

    if (fs.existsSync(userDir)) {
      const files = fs.readdirSync(userDir);
      const avatarFile = files.find((f) => f.startsWith('avatar-'));
      if (avatarFile) {
        const filePath = path.join(userDir, avatarFile);
        const ext = path.extname(avatarFile).toLowerCase();
        const mimeTypes = {
          '.jpg': 'image/jpeg',
          '.jpeg': 'image/jpeg',
          '.png': 'image/png',
          '.webp': 'image/webp',
        };
        res.setHeader('Content-Type', mimeTypes[ext] || 'image/jpeg');
        res.setHeader('Cache-Control', 'public, max-age=86400');
        res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
        const stream = fs.createReadStream(filePath);
        return stream.pipe(res);
      }
    }

    // If no avatar file on disk, fetch user to generate clean SVG with initials
    const user = await User.findById(id);
    const name = user ? user.name : 'User';
    const initials = name
      .trim()
      .split(/\s+/)
      .map((n) => n[0])
      .slice(0, 2)
      .join('')
      .toUpperCase() || 'U';

    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128" viewBox="0 0 128 128"><defs><linearGradient id="avatarGrad" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#2563eb" /><stop offset="100%" stop-color="#1d4ed8" /></linearGradient></defs><circle cx="64" cy="64" r="64" fill="url(#avatarGrad)" /><text x="64" y="73" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif" font-size="44" font-weight="700" fill="#ffffff" text-anchor="middle" dominant-baseline="middle">${initials}</text></svg>`;

    res.setHeader('Content-Type', 'image/svg+xml');
    res.setHeader('Cache-Control', 'public, max-age=3600');
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
    return res.send(svg);
  } catch (error) {
    return next(error);
  }
};

/**
 * @route   DELETE /api/users/avatar
 * @desc    Remove authenticated user's profile photo
 * @access  Private (Authenticated)
 */
const deleteAvatar = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        status: 404,
        message: 'User not found.',
      });
    }

    // Clean up local disk avatar files for user
    const userDir = path.join(AVATAR_STORAGE_DIR, user._id.toString());
    if (fs.existsSync(userDir)) {
      try {
        const files = fs.readdirSync(userDir);
        for (const file of files) {
          fs.unlinkSync(path.join(userDir, file));
        }
      } catch (_) {}
    }

    user.profile = user.profile || {};
    user.profile.avatarUrl = '';
    await user.save();

    return res.status(200).json({
      success: true,
      status: 200,
      message: 'Profile photo removed successfully.',
    });
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  getProfile,
  updateProfile,
  uploadResume,
  deleteResume,
  downloadResume,
  uploadAvatar,
  getAvatar,
  deleteAvatar,
};
