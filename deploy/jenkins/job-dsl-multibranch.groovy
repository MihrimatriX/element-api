// Job DSL — Multibranch Pipeline for element-api
// Paste into: Manage Jenkins → Script Console  OR  a seed freestyle "Process Job DSLs" build
// after installing the Job DSL plugin. Or use the UI steps in docs/CI-JENKINS.md.
//
// Replace credentialsId if you use a different Jenkins credential.

multibranchPipelineJob('element-api') {
  displayName('element-api')
  description('Path-based Multibranch — root Jenkinsfile (docs/CI-JENKINS.md)')
  branchSources {
    branchSource {
      source {
        github {
          id('element-api-github')
          repoOwner('MihrimatriX')
          repository('element-api')
          repositoryUrl('https://github.com/MihrimatriX/element-api.git')
          configuredByUrl(true)
          credentialsId('github-element-api') // create in Jenkins: Username+token or GitHub App
          traits {
            gitHubBranchDiscovery {
              strategyId(3) // all branches
            }
            gitHubPullRequestDiscovery {
              strategyId(1) // merge with base
            }
            headWildcardFilter {
              includes('*')
              excludes('')
            }
          }
        }
      }
      strategy {
        defaultBranchPropertyStrategy {
          props {
            // keep builds for a while
            buildRetentionBranchProperty {
              buildDiscarder {
                logRotator {
                  daysToKeepStr('30')
                  numToKeepStr('20')
                  artifactDaysToKeepStr('-1')
                  artifactNumToKeepStr('-1')
                }
              }
            }
          }
        }
      }
    }
  }
  factory {
    workflowBranchProjectFactory {
      scriptPath('Jenkinsfile')
    }
  }
  orphanedItemStrategy {
    discardOldItems {
      daysToKeep(14)
      numToKeep(20)
    }
  }
  triggers {
    periodicFolderTrigger {
      interval('1d')
    }
  }
}
