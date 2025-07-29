# soxdrawer

An in-memory local object store for temporarily holding links/files/etc that you want to revisit later on.

## Architecture

**Blob Storage**
- Golang application
- Embedded NATS Server (~20mb)
- NATS Client in order to communicate to the object store

**Browser interface**
- Embedded HTTP Server
- Frontend will be HTML/CSS/JS or React.

### UX

The main UI will be a drag and drop area where users will be able to drag links/files/pictures/text to.

#### References

- [Object Store NATS](https://docs.nats.io/nats-concepts/jetstream/obj_store)
