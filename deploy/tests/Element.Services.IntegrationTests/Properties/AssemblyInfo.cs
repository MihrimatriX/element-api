using Xunit;

// Every test class starts its own containers and service hosts; running them one at a time keeps
// Docker load and port usage predictable.
[assembly: CollectionBehavior(DisableTestParallelization = true)]
