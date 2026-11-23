# Horizon — Database & Data Models Specification

**Document Version:** 1.0.0  
**Status:** Under Architectural Review  
**Author:** Senior Software Architect  
**Storage Model:** Client-Side LocalStorage + Schema Versioned State  

---

## 1. Storage Architecture Strategy

### 1.1 LocalStorage vs. Remote Database Evaluation
For Horizon v1, **browser `LocalStorage` is the primary persistence engine**.

- **Why No Server-Side Database (PostgreSQL / MongoDB / Firebase)?**
  1. *Instant Zero-Friction User Experience:* Horizon requires no registration wall, passwords, or email verifications. A user can open the app, paste a course URL, and get a wallpaper in 60 seconds.
  2. *Data Privacy:* Users' educational goals, timelines, and personal commitments remain entirely on their personal device.
  3. *Zero Infrastructure Overhead:* No database hosting bills, connection pool management, or database backup costs.
  4. *Offline Resilience:* Full functionality without internet connectivity once loaded.

### 1.2 Storage Quota & Capacity Planning
- Typical browser LocalStorage quota: $5\text{ MB} - 10\text{ MB}$.
- Horizon's entire data model for an active goal with 50 milestones occupies $\approx 15\text{ KB}$ of serialized JSON.
- Therefore, Horizon consumes less than **$0.3\%$ of the available LocalStorage budget**, providing ample room for up to 20 archived goals.

---

## 2. Namespace & Key Architecture

To prevent collision with other applications and facilitate future migrations, all Horizon keys are prefixed with `horizon_v1_`:

| LocalStorage Key | Entity Stored | Type | Description |
| :--- | :--- | :--- | :--- |
| `horizon_v1_goals` | Array of Goal records | `Array<Goal>` | All created goals (active and archived). |
| `horizon_v1_active_goal_id`| Active Goal UUID | `string` | The ID of the currently selected goal in the UI. |
| `horizon_v1_templates` | Custom or overridden templates | `Array<Template>` | Default templates are bundled in code; overrides live here. |
| `horizon_v1_settings` | User application preferences | `UserSettings` | Device preview preset, theme mode, export settings. |
| `horizon_v1_schema_meta`| Schema metadata & migration info | `SchemaMeta` | Tracks database version (`1.0.0`) for automated migrations. |

---

## 3. Data Entities & JSON Schemas

### 3.1 Goal Entity (`Goal`)
The central entity representing a user's objective, deadline, and customization options.

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "Goal",
  "type": "object",
  "required": ["id", "title", "category", "targetDate", "totalDays", "templateId", "createdAt", "updatedAt", "milestones"],
  "properties": {
    "id": {
      "type": "string",
      "format": "uuid",
      "description": "Unique identifier (UUIDv4) for the goal."
    },
    "title": {
      "type": "string",
      "minLength": 3,
      "maxLength": 60,
      "description": "Goal title (e.g., 'Master LLM Engineering')."
    },
    "description": {
      "type": "string",
      "maxLength": 200,
      "description": "Optional short summary of the goal."
    },
    "category": {
      "type": "string",
      "enum": ["Learning", "Certification", "Project", "Fitness", "Personal"],
      "default": "Learning"
    },
    "targetDate": {
      "type": "string",
      "format": "date-time",
      "description": "ISO 8601 target deadline timestamp."
    },
    "totalDays": {
      "type": "integer",
      "minimum": 1,
      "maximum": 365,
      "description": "Total duration allocated in days."
    },
    "templateId": {
      "type": "string",
      "description": "Selected wallpaper template ID (e.g., 'alpine-peak')."
    },
    "exportPreset": {
      "type": "string",
      "enum": ["MOBILE_1080x1920", "DESKTOP_1920x1080"],
      "default": "MOBILE_1080x1920"
    },
    "courseMetadata": {
      "type": ["object", "null"],
      "$ref": "#/definitions/CourseMetadata"
    },
    "milestones": {
      "type": "array",
      "items": { "$ref": "#/definitions/Milestone" }
    },
    "streakDays": {
      "type": "integer",
      "minimum": 0,
      "default": 1
    },
    "createdAt": {
      "type": "string",
      "format": "date-time"
    },
    "updatedAt": {
      "type": "string",
      "format": "date-time"
    }
  }
}
```

### 3.2 Course Metadata (`CourseMetadata`)
Captures raw and normalized data retrieved from external course URLs or manual syllabus inputs.

```json
{
  "definitions": {
    "CourseMetadata": {
      "type": "object",
      "required": ["sourceType", "title"],
      "properties": {
        "sourceUrl": {
          "type": ["string", "null"],
          "format": "uri",
          "description": "Original pasted course URL (e.g., Udemy)."
        },
        "sourceType": {
          "type": "string",
          "enum": ["UDEMY", "COURSERA", "YOUTUBE", "GENERIC_WEB", "MANUAL_SYLLABUS"]
        },
        "title": { "type": "string" },
        "author": { "type": ["string", "null"] },
        "totalSections": { "type": "integer", "minimum": 1 },
        "totalLectures": { "type": ["integer", "null"] },
        "durationHours": { "type": ["number", "null"] },
        "rawSections": {
          "type": "array",
          "items": { "type": "string" },
          "description": "Extracted list of raw section titles."
        },
        "extractedAt": { "type": "string", "format": "date-time" }
      }
    }
  }
}
```

### 3.3 Milestone Entity (`Milestone`)
Discrete learning units distributed across the schedule.

```json
{
  "definitions": {
    "Milestone": {
      "type": "object",
      "required": ["id", "order", "title", "targetDay", "completed"],
      "properties": {
        "id": { "type": "string" },
        "order": { "type": "integer", "minimum": 1 },
        "title": { "type": "string", "maxLength": 100 },
        "subSections": {
          "type": "array",
          "items": { "type": "string" },
          "description": "Course lectures or subtopics grouped under this milestone."
        },
        "targetDay": {
          "type": "integer",
          "minimum": 1,
          "description": "The day number (1 to totalDays) by which this milestone should be achieved."
        },
        "isQuiz": {
          "type": "boolean",
          "default": false,
          "description": "True if this milestone is an assessment, quiz, or capstone review."
        },
        "completed": {
          "type": "boolean",
          "default": false
        },
        "completedAt": {
          "type": ["string", "null"],
          "format": "date-time"
        }
      }
    }
  }
}
```

### 3.4 Achievement Badge Entity (`AchievementBadge`)
Computed dynamically from milestone progress.

```json
{
  "definitions": {
    "AchievementBadge": {
      "type": "object",
      "required": ["id", "key", "name", "natureSymbol", "unlocked", "thresholdPct"],
      "properties": {
        "id": { "type": "string" },
        "key": {
          "type": "string",
          "enum": ["FIRST_STEP", "EXPLORER", "HALFWAY_HERO", "CONSISTENCY", "ACHIEVER"]
        },
        "name": { "type": "string" },
        "natureSymbol": { "type": "string", "description": "e.g., 'Sprout', 'Ridge', 'Summit'" },
        "description": { "type": "string" },
        "thresholdPct": { "type": "number", "minimum": 0, "maximum": 100 },
        "unlocked": { "type": "boolean" },
        "unlockedAt": { "type": ["string", "null"], "format": "date-time" }
      }
    }
  }
}
```

### 3.5 Wallpaper Template Configuration (`WallpaperTemplate`)
Defines the visual theme and coordinates for the Canvas rendering engine.

```json
{
  "definitions": {
    "WallpaperTemplate": {
      "type": "object",
      "required": ["id", "name", "category", "palette", "safeZones"],
      "properties": {
        "id": { "type": "string" },
        "name": { "type": "string" },
        "category": {
          "type": "string",
          "enum": ["FOREST_MOUNTAIN", "OCEAN", "SUNRISE_SUNSET", "MINIMAL_NATURE"]
        },
        "palette": {
          "type": "object",
          "properties": {
            "backgroundGradient": {
              "type": "array",
              "items": { "type": "string" },
              "description": "Array of hex/rgb gradient stops."
            },
            "cardBackground": { "type": "string" },
            "primaryText": { "type": "string" },
            "secondaryText": { "type": "string" },
            "accentColor": { "type": "string" },
            "progressBarColor": { "type": "string" },
            "badgeTint": { "type": "string" }
          }
        },
        "safeZones": {
          "type": "object",
          "properties": {
            "mobileTopPadding": { "type": "number", "default": 280 },
            "mobileBottomPadding": { "type": "number", "default": 200 }
          }
        }
      }
    }
  }
}
```

### 3.6 User Application Settings (`UserSettings`)
```json
{
  "definitions": {
    "UserSettings": {
      "type": "object",
      "properties": {
        "theme": { "type": "string", "enum": ["dark", "light"], "default": "dark" },
        "defaultExportFormat": { "type": "string", "enum": ["MOBILE", "DESKTOP"], "default": "MOBILE" },
        "autoSave": { "type": "boolean", "default": true },
        "showDevSafeZoneBorders": { "type": "boolean", "default": false },
        "lastExportedAt": { "type": ["string", "null"], "format": "date-time" }
      }
    }
  }
}
```

---

## 4. Schema Versioning & Migration Engine

To protect against schema evolution breaking existing user local data, Horizon implements a lightweight schema version runner upon application boot:

```javascript
const CURRENT_SCHEMA_VERSION = 1;

export function initializeAndMigrateStorage() {
  const metaRaw = localStorage.getItem('horizon_v1_schema_meta');
  let meta = metaRaw ? JSON.parse(metaRaw) : { version: 0 };

  if (meta.version < CURRENT_SCHEMA_VERSION) {
    console.info(`[Horizon] Upgrading storage schema from v${meta.version} to v${CURRENT_SCHEMA_VERSION}...`);
    
    // Migration v0 -> v1: Initialize default keys if empty
    if (meta.version === 0) {
      if (!localStorage.getItem('horizon_v1_goals')) {
        localStorage.setItem('horizon_v1_goals', JSON.stringify([]));
      }
      if (!localStorage.getItem('horizon_v1_settings')) {
        localStorage.setItem('horizon_v1_settings', JSON.stringify({
          theme: 'dark',
          defaultExportFormat: 'MOBILE',
          showDevSafeZoneBorders: false
        }));
      }
    }
    
    // Save updated metadata
    localStorage.setItem('horizon_v1_schema_meta', JSON.stringify({
      version: CURRENT_SCHEMA_VERSION,
      migratedAt: new Date().toISOString()
    }));
  }
}
```

---

## 5. Backup, Export, and Disaster Recovery

### 5.1 Manual JSON Backup & Restore
To ensure users never lose their milestone progress when clearing browser cookies or switching computers:
- **Export Backup:** Horizon provides a one-click *"Export Workspace Backup (JSON)"* action that serializes all active goals, settings, and progress into a clean file: `horizon-backup-[date].json`.
- **Import Restore:** A file-upload input accepts valid Horizon backup files, validates JSON schema compliance, and restores the entire state into LocalStorage with immediate UI reactivity.

### 5.2 Quota Overflow Handling
In the unlikely event of a `QuotaExceededError` (e.g., if a user stores hundreds of goals or browser quota is severely restricted):
1. The app catches the exception gracefully.
2. Identifies archived goals with 100% completion older than 60 days.
3. Prompts user: *"Local storage limit approaching. Would you like to archive or export your completed goals?"*
4. Never silently deletes user data.
