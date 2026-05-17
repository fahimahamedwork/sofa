package git

import (
	"context"
	"fmt"
	"os"
	"path/filepath"
	"time"

	"github.com/go-git/go-git/v5"
	"github.com/go-git/go-git/v5/plumbing"
)

// CloneRepo clones a git repository to a temporary directory and checks out the specified branch
func CloneRepo(ctx context.Context, repoURL, branch, sshKeyPath string) (string, error) {
	tmpDir := filepath.Join(os.TempDir(), fmt.Sprintf("sofa-build-%d", time.Now().UnixNano()))
	if err := os.MkdirAll(tmpDir, 0755); err != nil {
		return "", fmt.Errorf("creating temp directory: %w", err)
	}

	cloneOpts := &git.CloneOptions{
		URL:      repoURL,
		Progress: os.Stdout,
	}

	if branch != "" {
		cloneOpts.ReferenceName = plumbing.ReferenceName("refs/heads/" + branch)
		cloneOpts.SingleBranch = true
		cloneOpts.Depth = 1
	}

	// In production, SSH key authentication would be set up here
	// For now, we support public repos and basic auth
	// if sshKeyPath != "" {
	// 	publicKey, err := ssh.NewPublicKeysFromFile("git", sshKeyPath, "")
	// 	if err != nil {
	// 		return "", fmt.Errorf("loading SSH key: %w", err)
	// 	}
	// 	cloneOpts.Auth = publicKey
	// }

	repo, err := git.PlainCloneContext(ctx, tmpDir, false, cloneOpts)
	if err != nil {
		os.RemoveAll(tmpDir)
		return "", fmt.Errorf("cloning repository: %w", err)
	}

	// Verify we're on the correct branch
	if branch != "" {
		wt, err := repo.Worktree()
		if err != nil {
			os.RemoveAll(tmpDir)
			return "", fmt.Errorf("getting worktree: %w", err)
		}

		refName := plumbing.ReferenceName("refs/heads/" + branch)
		if err := wt.Checkout(&git.CheckoutOptions{
			Branch: refName,
		}); err != nil {
			// Try origin/branch
			if err := wt.Checkout(&git.CheckoutOptions{
				Branch: plumbing.ReferenceName("refs/remotes/origin/" + branch),
			}); err != nil {
				os.RemoveAll(tmpDir)
				return "", fmt.Errorf("checking out branch %s: %w", branch, err)
			}
		}
	}

	return tmpDir, nil
}

// PullRepo pulls the latest changes for an existing repository
func PullRepo(ctx context.Context, repoPath, branch string) error {
	repo, err := git.PlainOpen(repoPath)
	if err != nil {
		return fmt.Errorf("opening repository: %w", err)
	}

	wt, err := repo.Worktree()
	if err != nil {
		return fmt.Errorf("getting worktree: %w", err)
	}

	pullOpts := &git.PullOptions{
		RemoteName: "origin",
	}

	if branch != "" {
		pullOpts.ReferenceName = plumbing.ReferenceName("refs/heads/" + branch)
	}

	if err := wt.PullContext(ctx, pullOpts); err != nil {
		if err == git.NoErrAlreadyUpToDate {
			return nil
		}
		return fmt.Errorf("pulling repository: %w", err)
	}

	return nil
}

// GetLatestCommit returns the latest commit hash for a repository
func GetLatestCommit(ctx context.Context, repoPath string) (string, error) {
	repo, err := git.PlainOpen(repoPath)
	if err != nil {
		return "", fmt.Errorf("opening repository: %w", err)
	}

	ref, err := repo.Head()
	if err != nil {
		return "", fmt.Errorf("getting HEAD: %w", err)
	}

	return ref.Hash().String(), nil
}

// GetRepoStatus returns the current status of a repository
func GetRepoStatus(ctx context.Context, repoPath string) (map[string]interface{}, error) {
	repo, err := git.PlainOpen(repoPath)
	if err != nil {
		return nil, fmt.Errorf("opening repository: %w", err)
	}

	ref, err := repo.Head()
	if err != nil {
		return nil, fmt.Errorf("getting HEAD: %w", err)
	}

	commit, err := repo.CommitObject(ref.Hash())
	if err != nil {
		return nil, fmt.Errorf("getting commit: %w", err)
	}

	status := map[string]interface{}{
		"branch":      ref.Name().Short(),
		"commit_hash": ref.Hash().String(),
		"commit_msg":  commit.Message,
		"author":      commit.Author.Name,
		"date":        commit.Author.When.Format(time.RFC3339),
	}

	return status, nil
}
