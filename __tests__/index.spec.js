import React from "react";
import { render, fireEvent, Simulate } from "react-testing-library";
import createStore from "../src";

let Provider;
let Consumer;
let createMutator;

const baseState = {
  search: "",
  loggedIn: true,
  user: {
    name: "Bob Ross",
    handle: "happylittlemistake",
    id: 42
  },
  posts: [
    {
      id: "e7db2fe4-ebae-4a71-9722-9433ebdc3108",
      title: "The Dark Side of Painting",
      subtitle: "And I don't mean Midnight Black",
      body: "...",
      authorID: 24
    },
    {
      id: "bcdcf6ba-8978-453f-8a4a-dbdd6705e2d4",
      title: "The Joy of Painting",
      subtitle: "(thats the name of the show)",
      body: "!!!",
      authorID: 42
    }
  ]
};

describe("copy-on-write-store", () => {
  beforeEach(() => {
    const State = createStore(baseState);
    Provider = State.Provider;
    Consumer = State.Consumer;
    createMutator = State.createMutator;
  });

  it("passes in state and an updater", () => {
    const log = [];
    let updater;
    class App extends React.Component {
      render() {
        return (
          <Provider>
            <div>
              <Consumer>
                {(state, update) => {
                  log.push(state);
                  updater = update;
                  return null;
                }}
              </Consumer>
            </div>
          </Provider>
        );
      }
    }
    render(<App />);
    // First render is the base state
    expect(log).toEqual([baseState]);
    expect(typeof updater).toBe("function");
  });

  it("updates state", () => {
    const log = [];
    let updater;
    class App extends React.Component {
      render() {
        return (
          <Provider>
            <div>
              <Consumer>
                {(state, update) => {
                  log.push(state);
                  updater = update;
                  return null;
                }}
              </Consumer>
            </div>
          </Provider>
        );
      }
    }
    render(<App />);
    // First render is the base state
    expect(log).toEqual([baseState]);
    updater(draft => {
      draft.user.name = "Mithrandir";
    });
    // Second render should have the updated user
    expect(log[1].user.name).toBe("Mithrandir");
    // Other fields shouldn't have been updated
    expect(log[0].posts).toEqual(log[1].posts);
  });

  it("memoizes selectors", () => {
    let log = [];
    let updater;
    class App extends React.Component {
      render() {
        return (
          <Provider>
            <Consumer selector={state => state.user}>
              {(user, update) => {
                log.push("Render User");
                updater = update;
                return null;
              }}
            </Consumer>
            <Consumer selector={state => state.posts}>
              {posts => {
                log.push("Render Posts");
                return null;
              }}
            </Consumer>
            <Consumer selector={state => state}>
              {state => {
                log.push("Render State");
                return null;
              }}
            </Consumer>
          </Provider>
        );
      }
    }
    render(<App />);
    expect(log).toEqual(["Render User", "Render Posts", "Render State"]);
    log = [];
    updater(draft => {
      draft.user.id = 5;
    });
    // Shouldn't re-render Posts
    expect(log).toEqual(["Render User", "Render State"]);
  });

  it("supports multiple selectors", () => {
    let log = [];
    let updater;

    const UserPosts = ({ children }) => (
      <Consumer selector={[state => state.user.id, state => state.posts]}>
        {([userID, posts]) => {
          const userPosts = posts.filter(post => post.authorID === userID);
          return children(userPosts);
        }}
      </Consumer>
    );

    class App extends React.Component {
      render() {
        return (
          <Provider>
            <div>
              <UserPosts>
                {posts => {
                  log.push(posts);
                  return null;
                }}
              </UserPosts>
              <Consumer>
                {(state, update) => {
                  log.push("Render Consumer");
                  updater = update;
                  return null;
                }}
              </Consumer>
            </div>
          </Provider>
        );
      }
    }
    render(<App />);
    expect(log).toEqual([
      // Assumes that only the second post is associated with the user
      [baseState.posts[1]],
      "Render Consumer"
    ]);
    log = [];
    updater(draft => {
      draft.loggedIn = false;
    });
    // Shouldn't have re-rendered UserPosts
    expect(log).toEqual(["Render Consumer"]);
  });

  it('createMutator', () => {
    let log = [];

    const updateUserHandle = createMutator((draft, newHandle) => {
      draft.user.handle = newHandle;
    });

    class App extends React.Component {
      render() {
        return (
          <Provider>
           <div>
            <Consumer selector={state => state.user.handle}>
              {handle => {
                log.push(handle);
                return null;
              }}
            </Consumer> 
           </div>
          </Provider>
        )
      }
    }

    render(<App />);
    expect(log).toEqual(['happylittlemistake']);
    log = [];
    updateUserHandle('sadbigdecisions');
    expect(log).toEqual(['sadbigdecisions']);
  });
});
