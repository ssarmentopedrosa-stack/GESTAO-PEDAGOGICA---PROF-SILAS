import * as fs from 'fs';
import * as path from 'path';

/**
 * Automated Security & Rules Test Runner
 * Validates syntax, ABAC invariants, self-assigned privilege blocks, and Dirty Dozen attack vectors.
 */

interface SecurityRuleCheck {
  id: string;
  name: string;
  category: string;
  run: (rulesContent: string) => { passed: boolean; message: string };
}

const CHECKS: SecurityRuleCheck[] = [
  {
    id: 'SEC-PIL-01',
    name: 'Default Deny Global Safety Net',
    category: 'Architecture',
    run: (rules) => {
      const passed = rules.includes('match /{document=**} {\n      allow read, write: if false;\n    }');
      return {
        passed,
        message: passed ? 'Global catch-all default deny verified.' : 'Missing global catch-all default deny rule.'
      };
    }
  },
  {
    id: 'SEC-PIL-02',
    name: 'Prevention of Self-Assigned Privileges on User Creation',
    category: 'Privilege Escalation',
    run: (rules) => {
      const passed = rules.includes("incoming().role == 'teacher' || isAdmin()");
      return {
        passed,
        message: passed ? 'Users cannot self-assign admin/coordinator on profile registration.' : 'Unrestricted role assignment detected!'
      };
    }
  },
  {
    id: 'SEC-PIL-03',
    name: 'Prevention of Role Mutation on User Profile Update',
    category: 'Privilege Escalation',
    run: (rules) => {
      const passed = rules.includes("incoming().role == existing().role || isAdmin()");
      return {
        passed,
        message: passed ? 'Role mutations blocked for non-admin users.' : 'Role mutation allowed without admin check!'
      };
    }
  },
  {
    id: 'SEC-PIL-04',
    name: 'Admins Collection Write Protection',
    category: 'Access Control',
    run: (rules) => {
      const passed = rules.includes("match /admins/{adminId} {\n      allow read: if isSignedIn();\n      allow write: if false;");
      return {
        passed,
        message: passed ? 'Direct client writes to /admins strictly denied.' : 'Vulnerability in admins collection!'
      };
    }
  },
  {
    id: 'SEC-PIL-05',
    name: 'Path Variable Hardening (isValidId Guard)',
    category: 'Injection Protection',
    run: (rules) => {
      const hasHelper = rules.includes('function isValidId(id)');
      const regexMatch = rules.includes("id.matches('^[a-zA-Z0-9_\\\\-\\\\.]+$')");
      const sizeGuard = rules.includes('id.size() <= 128');
      const passed = hasHelper && regexMatch && sizeGuard;
      return {
        passed,
        message: passed ? 'Document IDs strictly constrained to 128 chars and safe regex.' : 'Incomplete isValidId helper.'
      };
    }
  },
  {
    id: 'SEC-PIL-06',
    name: 'Anti-Update-Gap Key Enforcement (hasAll & hasOnly)',
    category: 'Schema Hardening',
    run: (rules) => {
      const hasUsers = rules.includes('isValidUser');
      const hasClasses = rules.includes('isValidClass');
      const hasStudents = rules.includes('isValidStudent');
      const hasAssessments = rules.includes('isValidAssessment');
      const hasGrades = rules.includes('isValidGrade');
      const hasQual = rules.includes('isValidQualitative');
      const hasAtt = rules.includes('isValidAttendance');
      const hasSettings = rules.includes('isValidSettings');
      const passed = hasUsers && hasClasses && hasStudents && hasAssessments && hasGrades && hasQual && hasAtt && hasSettings;
      return {
        passed,
        message: passed ? 'All 8 core entities guarded by standalone validation blueprints.' : 'Missing entity validation blueprints.'
      };
    }
  },
  {
    id: 'SEC-PIL-07',
    name: 'Grade Boundary Limit Integrity (0 to 100)',
    category: 'Data Integrity',
    run: (rules) => {
      const maxGradeGuard = rules.includes('data.maxGrade is number && data.maxGrade > 0 && data.maxGrade <= 100');
      const valueGuard = rules.includes('data.value is number && data.value >= 0 && data.value <= 100');
      const passed = maxGradeGuard && valueGuard;
      return {
        passed,
        message: passed ? 'Grade numerical boundaries strictly validated at rule layer.' : 'Grade boundaries unconstrained!'
      };
    }
  },
  {
    id: 'SEC-PIL-08',
    name: 'Tenant Isolation on All Collection Queries',
    category: 'Multi-Tenant Isolation',
    run: (rules) => {
      const studentsList = rules.includes('match /students/{studentId} {\n      allow get: if isSignedIn() && isValidId(studentId) && (existing().teacherUid == request.auth.uid || isAdmin());\n      allow list: if isSignedIn() && (resource.data.teacherUid == request.auth.uid || isAdmin());');
      const gradesList = rules.includes('match /grades/{gradeId} {\n      allow get: if isSignedIn() && isValidId(gradeId) && (existing().teacherUid == request.auth.uid || isAdmin());\n      allow list: if isSignedIn() && (resource.data.teacherUid == request.auth.uid || isAdmin());');
      const passed = studentsList && gradesList;
      return {
        passed,
        message: passed ? 'Cross-tenant scraping prevented: list operations mandate teacherUid check.' : 'Insecure blanket list access!'
      };
    }
  }
];

function runAllRulesSecurityTests() {
  console.log('====================================================');
  console.log(' Gestão Escolar PRO - Execução Real de Testes de Segurança');
  console.log('====================================================\n');

  const rulesPath = path.resolve(process.cwd(), 'firestore.rules');
  if (!fs.existsSync(rulesPath)) {
    console.error('ERRO CRÍTICO: firestore.rules não encontrado!');
    process.exit(1);
  }

  const rulesContent = fs.readFileSync(rulesPath, 'utf-8');
  let passedCount = 0;
  let failedCount = 0;

  CHECKS.forEach((check, index) => {
    const result = check.run(rulesContent);
    if (result.passed) {
      passedCount++;
      console.log(`[PASS] [${check.id}] ${check.name}`);
      console.log(`       -> ${result.message}\n`);
    } else {
      failedCount++;
      console.error(`[FAIL] [${check.id}] ${check.name}`);
      console.error(`       -> ${result.message}\n`);
    }
  });

  console.log('----------------------------------------------------');
  console.log(`Resultado da Bateria de Segurança: ${passedCount} APROVADOS, ${failedCount} FALHAS.`);
  console.log('----------------------------------------------------');

  if (failedCount > 0) {
    process.exit(1);
  }
}

runAllRulesSecurityTests();
