// Freestyle / Pipeline seed that applies job-dsl-multibranch.groovy
// Optional: create a job named "seed-element-api" whose only step is
// "Process Job DSLs" → look on filesystem → deploy/jenkins/job-dsl-multibranch.groovy
//
// Nightly full suite (separate Pipeline job cron example):
//   H 2 * * 1-5
//   pwsh -NoProfile -File ./deploy/scripts/test-all.ps1 -Configuration Review -Integration

pipelineJob('element-api-nightly') {
  displayName('element-api nightly full suite')
  description('Full test-all — catches cross-service breaks path CI misses')
  properties {
    pipelineTriggers {
      triggers {
        cron {
          spec('H 2 * * 1-5')
        }
      }
    }
  }
  definition {
    cpsScm {
      scm {
        git {
          remote {
            url('https://github.com/MihrimatriX/element-api.git')
            credentials('github-element-api')
          }
          branches('*/main')
        }
      }
      scriptPath('deploy/jenkins/Jenkinsfile.nightly')
      lightweight(true)
    }
  }
}
