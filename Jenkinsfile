// Path-based Multibranch Pipeline for element-api.
// Operator setup: docs/CI-JENKINS.md
// Change detection: git diff against the PR target branch (CHANGE_TARGET, default main), falling
// back to the previous commit (HEAD~1). When neither works every stage runs ('FORCE_ALL').
// The agent is Windows, hence `bat`.

/** Files changed by this build, or ['FORCE_ALL'] when the diff cannot be computed. */
def changedFiles() {
  def diffOutput = ''
  def baseBranch = env.CHANGE_TARGET ?: 'main'
  try {
    diffOutput = bat(returnStdout: true, script: "@echo off & git diff --name-only origin/${baseBranch}...HEAD").trim()
  } catch (ignored) {
    try {
      diffOutput = bat(returnStdout: true, script: "@echo off & git diff --name-only HEAD~1").trim()
    } catch (ignoredAgain) {
      diffOutput = 'FORCE_ALL'
    }
  }
  return diffOutput ? diffOutput.split(/\r?\n/) as List : ['FORCE_ALL']
}

/** True when any changed file starts with one of the prefixes (always true for FORCE_ALL). */
boolean touchesAny(List files, String... prefixes) {
  if (files.contains('FORCE_ALL')) return true
  return files.any { file -> prefixes.any { prefix -> file.startsWith(prefix) } }
}

/** True when the change is documentation only, so the heavy build stages can be skipped. */
boolean isDocsOnly(List files) {
  if (files.contains('FORCE_ALL')) return false
  return files.every { file ->
    file.startsWith('docs/') || file == 'TODO.md' || file == 'LICENSE' ||
    file.startsWith('.cursor/') || (file.endsWith('.md') && !file.contains('Jenkins'))
  }
}

pipeline {
  agent any
  options {
    timestamps()
    disableConcurrentBuilds()
    timeout(time: 90, unit: 'MINUTES')
  }
  environment {
    CI = 'true'
  }
  stages {
    stage('Detect paths') {
      steps {
        script {
          def files = changedFiles()
          echo "Changed files:\n${files.join('\n')}"
          // Each RUN_* flag ('1'/'0') switches one stage below on or off.
          env.RUN_DOCS_ONLY = isDocsOnly(files) ? '1' : '0'
          env.RUN_ORDER = touchesAny(files, 'order-service/', 'shared-lib/', 'docker/', 'docker-compose') ? '1' : '0'
          env.RUN_WEB = touchesAny(files, 'web-app/') ? '1' : '0'
          env.RUN_GATEWAY = touchesAny(files, 'gateway-service/', 'shared-lib/', 'docker/', 'docker-compose') ? '1' : '0'
          env.RUN_DOTNET = touchesAny(files,
            'identity-service/', 'catalog-service/', 'compound-service/',
            'shipment-service/', 'notification-service/', 'science-service/',
            'shared-lib/', 'deploy/tests/', 'docker/', 'docker-compose') ? '1' : '0'
          env.RUN_WALLET = touchesAny(files, 'wallet-service/', 'docker/', 'docker-compose') ? '1' : '0'
          env.RUN_INVENTORY = touchesAny(files, 'inventory-service/', 'docker/', 'docker-compose') ? '1' : '0'
          env.RUN_E2E = (env.RUN_WEB == '1' || touchesAny(files, 'science-service/')) ? '1' : '0'
          env.RUN_SMOKE = touchesAny(files, 'docker/', 'docker-compose', 'deploy/Caddyfile', 'deploy/scripts/') ? '1' : '0'
          // A pipeline change must at least prove the Node and web stages still run.
          if (touchesAny(files, 'Jenkinsfile', 'docs/CI-JENKINS')) {
            env.RUN_ORDER = '1'
            env.RUN_WEB = '1'
          }
        }
      }
    }

    stage('Docs-only') {
      when { expression { env.RUN_DOCS_ONLY == '1' } }
      steps {
        echo 'Docs/TODO-only change — skipping heavy builds.'
      }
    }

    stage('order-service') {
      when {
        allOf {
          expression { env.RUN_DOCS_ONLY != '1' }
          expression { env.RUN_ORDER == '1' }
        }
      }
      steps {
        dir('order-service') {
          bat 'npm ci'
          bat 'npm run check'
          bat 'npm test'
        }
      }
    }

    stage('web-app') {
      when {
        allOf {
          expression { env.RUN_DOCS_ONLY != '1' }
          expression { env.RUN_WEB == '1' }
        }
      }
      steps {
        dir('web-app') {
          bat 'npm ci'
          bat 'npm run lint'
          bat 'npm test'
        }
      }
    }

    stage('dotnet unit') {
      when {
        allOf {
          expression { env.RUN_DOCS_ONLY != '1' }
          expression { env.RUN_DOTNET == '1' || env.RUN_GATEWAY == '1' }
        }
      }
      steps {
        bat 'pwsh -NoProfile -File ./deploy/scripts/test-unit.ps1 -Configuration Review'
      }
    }

    stage('wallet-service') {
      when {
        allOf {
          expression { env.RUN_DOCS_ONLY != '1' }
          expression { env.RUN_WALLET == '1' }
        }
      }
      steps {
        dir('wallet-service') {
          bat 'mvn -B -q test'
        }
      }
    }

    stage('inventory-service') {
      when {
        allOf {
          expression { env.RUN_DOCS_ONLY != '1' }
          expression { env.RUN_INVENTORY == '1' }
        }
      }
      steps {
        dir('inventory-service') {
          bat 'mvn -B -q test'
        }
      }
    }

    stage('Playwright smoke') {
      when {
        allOf {
          expression { env.RUN_DOCS_ONLY != '1' }
          expression { env.RUN_E2E == '1' }
          expression { return fileExists('web-app/e2e') }
        }
      }
      steps {
        dir('web-app') {
          bat 'npx playwright install chromium'
          bat 'npm run test:e2e'
        }
      }
    }

    stage('Compose health (optional)') {
      when {
        allOf {
          expression { env.RUN_DOCS_ONLY != '1' }
          expression { env.RUN_SMOKE == '1' }
          expression { return env.RUN_COMPOSE_SMOKE == '1' }
        }
      }
      steps {
        bat 'pwsh -NoProfile -File ./deploy/scripts/jenkins-compose-smoke.ps1'
      }
    }
  }
  post {
    failure {
      echo 'Pipeline failed — treat as merge blocker (require this Multibranch job as a GitHub status check).'
    }
  }
}
