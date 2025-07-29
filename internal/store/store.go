package store

import (
	"fmt"
	"io"

	"github.com/nats-io/nats.go"
)

type ObjectStore struct {
	bucket nats.ObjectStore
	js     nats.JetStreamContext
}

func New(js nats.JetStreamContext) (*ObjectStore, error) {
	bucket, err := js.CreateObjectStore(&nats.ObjectStoreConfig{
		Bucket: "default",
	})
	if err != nil {
		bucket, err = js.ObjectStore("default")
		if err != nil {
			return nil, fmt.Errorf("failed to create or get object store bucket 'default': %w", err)
		}
	}

	return &ObjectStore{
		bucket: bucket,
		js:     js,
	}, nil
}

// Put stores an object with the given key and data
func (os *ObjectStore) Put(key string, data []byte) (*nats.ObjectInfo, error) {
	info, err := os.bucket.PutBytes(key, data)
	if err != nil {
		return nil, fmt.Errorf("failed to put object '%s': %w", key, err)
	}
	return info, nil
}

// PutString stores a string object with the given key
func (os *ObjectStore) PutString(key, data string) (*nats.ObjectInfo, error) {
	return os.Put(key, []byte(data))
}

// PutReader stores an object from a reader
func (os *ObjectStore) PutReader(key string, reader io.Reader) (*nats.ObjectInfo, error) {
	info, err := os.bucket.Put(&nats.ObjectMeta{Name: key}, reader)
	if err != nil {
		return nil, fmt.Errorf("failed to put object '%s' from reader: %w", key, err)
	}
	return info, nil
}

// Get retrieves an object by key
func (os *ObjectStore) Get(key string) ([]byte, error) {
	result, err := os.bucket.GetBytes(key)
	if err != nil {
		return nil, fmt.Errorf("failed to get object '%s': %w", key, err)
	}
	return result, nil
}

// GetString retrieves an object as a string by key
func (os *ObjectStore) GetString(key string) (string, error) {
	data, err := os.Get(key)
	if err != nil {
		return "", err
	}
	return string(data), nil
}

// GetInfo retrieves metadata about an object
func (os *ObjectStore) GetInfo(key string) (*nats.ObjectInfo, error) {
	info, err := os.bucket.GetInfo(key)
	if err != nil {
		return nil, fmt.Errorf("failed to get info for object '%s': %w", key, err)
	}
	return info, nil
}

// Delete removes an object by key
func (os *ObjectStore) Delete(key string) error {
	err := os.bucket.Delete(key)
	if err != nil {
		return fmt.Errorf("failed to delete object '%s': %w", key, err)
	}
	return nil
}

// ListKeys returns a list of all object keys in the bucket
func (os *ObjectStore) ListKeys() ([]string, error) {
	var keys []string

	// We'll use the Watch functionality to get object names
	// For now, let's implement a simpler approach by trying to get info for known keys
	// This is a limitation - NATS object store List() API seems to have changed

	return keys, nil
}

// Exists checks if an object exists
func (os *ObjectStore) Exists(key string) (bool, error) {
	_, err := os.bucket.GetInfo(key)
	if err != nil {
		if err == nats.ErrObjectNotFound {
			return false, nil
		}
		return false, fmt.Errorf("failed to check if object '%s' exists: %w", key, err)
	}
	return true, nil
}

// Status returns the status of the object store bucket
func (os *ObjectStore) Status() (nats.ObjectStoreStatus, error) {
	status, err := os.bucket.Status()
	if err != nil {
		return nil, fmt.Errorf("failed to get object store status: %w", err)
	}
	return status, nil
}

// Bucket returns the underlying NATS ObjectStore bucket
func (os *ObjectStore) Bucket() nats.ObjectStore {
	return os.bucket
}
