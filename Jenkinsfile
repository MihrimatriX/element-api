// Path-based Multibranch Pipeline for element-api.
// Operator setup: docs/CI-JENKINS.md
// Change detection: git diff vs changeTarget (PRs) or previous successful commit.

def changed() {
  def out = ''
  def base = env.CHANGE_TARGET ?: 'main'
  try {
    out = bat(returnStdout: true, script: "@echo off & git diff --name-only origin/${base}...HEAD").trim()
  } catch (ignored) {
    try {
      out = bat(returnStdout: true, script: "@echo off & git diff --name-only HEAD~1").trim()
    } catch (ignored2) {
      out = 'FORCE_ALL'
    }
  }
  return out ? out.split(/\r?\n/) as List : ['FORCE_ALL']
}

boolean prefix(List files, String... prefs) {
  if (files.contains('FORCE_ALL')) return true
  return files.any { f -> prefs.any { p -> f.startsWith(p) } }
}

boolean docsOnly(List files) {
  if (files.contains('FORCE_ALL')) return false
  return files.every { f ->
    f.startsWith('docs/') || f == 'TODO.md' || f == 'LICENSE' ||
    f.startsWith('.cursor/') || (f.endsWith('.md') && !f.contains('Jenkins'))
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
          def files = changed()
          echo "Changed files:\n${files.join('\n')}"
          env.RUN_DOCS_ONLY = docsOnly(files) ? '1' : '0'
          env.RUN_ORDER = prefix(files, 'order-service/') || prefix(files, 'shared-lib/', 'docker/', 'docker-compose') ? '1' : '0'
          env.RUN_WEB = prefix(files, 'web-app/') ? '1' : '0'
          env.RUN_GATEWAY = prefix(files, 'gateway-service/', 'shared-lib/', 'docker/', 'docker-compose') ? '1' : '0'
          env.RUN_DOTNET = prefix(files,
            'identity-service/', 'catalog-service/', 'compound-service/',
            'shipment-service/', 'notification-service/', 'science-service/',
            'shared-lib/', 'deploy/tests/', 'docker/', 'docker-compose') ? '1' : '0'
          env.RUN_WALLET = prefix(files, 'wallet-service/', 'docker/', 'docker-compose') ? '1' : '0'
          env.RUN_INVENTORY = prefix(files, 'inventory-service/', 'docker/', 'docker-compose') ? '1' : '0'
          env.RUN_E2E = (env.RUN_WEB == '1' || prefix(files, 'science-service/')) ? '1' : '0'
          env.RUN_SMOKE = prefix(files, 'docker/', 'docker-compose', 'deploy/Caddyfile', 'deploy/scripts/') ? '1' : '0'
          if (prefix(files, 'Jenkinsfile', 'docs/CI-JENKINS')) {
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
