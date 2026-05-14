import { ButtonBuilder, ElementBuilder, MovieBuilder } from "./builders.js";

// Externalized message strings
const messages = {
  dataLoadError: "Daten konnten nicht geladen werden, Status",
  movieAlreadyInCollection: "Film bereits in der Sammlung.",
  addMovieFailed: "Hinzufügen des Films ist fehlgeschlagen.",
  deleteMovieFailed: "Film konnte nicht gelöscht werden.",
  noResultsFound: "Keine Ergebnisse gefunden.",
  searchFailed: "Die Suche ist fehlgeschlagen...",
  loggedOutGreeting: "Bitte logge dich ein, um deine Filmkollektion zu sehen.",
  loginFailed: "Login failed",
};

let currentSession = null;

function updateGenres() {
  const header = document.querySelector("nav>h2");
  const listElement = document.querySelector("#filter");

  listElement.innerHTML = "";

  if (!currentSession) {
    header.style.display = "none";
    return;
  }

  fetch("/genres")
    .then((response) => {
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return response.json();
    })
    .then((genres) => {
      header.style.display = "block";
      new ElementBuilder("li")
        .append(new ButtonBuilder("All").onclick(() => loadMovies()))
        .appendTo(listElement);

      for (const genre of genres) {
        new ElementBuilder("li")
          .append(new ButtonBuilder(genre).onclick(() => loadMovies(genre)))
          .appendTo(listElement);
      }

      const firstButton = listElement.querySelector("button");
      if (firstButton) {
        firstButton.click();
      }
    })
    .catch((error) => {
      console.error("Failed to load genres:", error);
      listElement.append(`${messages.dataLoadError} ${error.message}`);
    });
}

function removeMovies() {
  const mainElement = document.querySelector("main");
  while (mainElement.childElementCount > 0) {
    mainElement.firstChild.remove();
  }
}

function loadMovies(genre) {
  const url = new URL("/movies", location.href);
  if (genre) {
    url.searchParams.set("genre", genre);
  }

  fetch(url)
    .then((response) => {
      removeMovies();
      const mainElement = document.querySelector("main");

      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return response.json();
    })
    .then((movies) => {
      const mainElement = document.querySelector("main");
      movies.forEach((movie) =>
        new MovieBuilder(movie, deleteMovie, Boolean(currentSession)).appendTo(
          mainElement,
        ),
      );
    })
    .catch((error) => {
      console.error("Failed to load movies:", error);
      const mainElement = document.querySelector("main");
      mainElement.append(`${messages.dataLoadError} ${error.message}`);
    });
}

function addMovie(imdbID) {
  fetch(`/movies/${imdbID}`, { method: "PUT" })
    .then((response) => {
      if (response.status === 201) {
        // Task 2.2: Make sure to remove the added movie from the search results to avoid
        // giving the user the option to add it again.
        const searchRow = document.getElementById(`search-${imdbID}`);
        if (searchRow) {
          searchRow.remove();
        }
        loadMovies();
        updateGenres();
      } else if (response.status === 200) {
        alert(messages.movieAlreadyInCollection);
      } else {
        throw new Error(`HTTP ${response.status}`);
      }
    })
    .catch((error) => {
      console.error("Failed to add movie:", error);
      alert(messages.addMovieFailed);
    });
}

function deleteMovie(imdbID) {
  fetch(`/movies/${imdbID}`, { method: "DELETE" })
    .then((response) => {
      if (response.ok) {
        const article = document.getElementById(imdbID);
        if (article) {
          article.remove();
        }
        updateGenres();
      } else {
        throw new Error(`HTTP ${response.status}`);
      }
    })
    .catch((error) => {
      console.error("Failed to delete movie:", error);
      alert(messages.deleteMovieFailed);
    });
}

function searchMovies(query) {
  fetch(`/search?query=${encodeURIComponent(query)}`)
    .then((response) => {
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return response.json();
    })
    .then((results) => {
      const resultsDiv = document.getElementById("searchResults");
      resultsDiv.innerHTML = "";

      // Task 2.2: Render the results returned from the server. Make sure to
      // include an "Add" button for each result that calls `addMovie(imdbID)` when clicked.
      // There is a second part to this task, in `addMovie`
      if (!results || results.length === 0) {
        new ElementBuilder("p")
          .text(messages.noResultsFound)
          .appendTo(resultsDiv);
        return;
      }

      // Task 2.2: 渲染服务器返回的结果
      results.forEach((movie) => {
        // 创建一个容器 div，并设置 ID，以便 addMovie 成功后能找到并删除它
        const movieRow = new ElementBuilder("div")
          .id(`search-${movie.imdbID}`)
          .addClass("search-result-row"); // 假设 CSS 中有这个类名

        // 添加文本内容（标题和年份）
        new ElementBuilder("span")
          .text(`${movie.Title} (${movie.Year}) `)
          .appendTo(movieRow.getElement());

        // 添加 "Add" 按钮
        new ButtonBuilder("Add")
          .onclick(() => addMovie(movie.imdbID))
          .appendTo(movieRow.getElement());

        // 将这一行添加到对话框的结果区域
        movieRow.appendTo(resultsDiv);
      });
    })
    .catch((error) => {
      console.error("Search failed:", error);
      const resultsDiv = document.getElementById("searchResults");
      new ElementBuilder("p").text(messages.searchFailed).appendTo(resultsDiv);
    });
}

window.onload = function () {
  // Check session
  fetch("/session")
    .then((response) => {
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return response.json();
    })
    .then((data) => {
      currentSession = data || null;
      updateUI();
    })
    .catch((error) => {
      console.error("Failed to load session:", error);
      currentSession = null;
      updateUI();
    });

  function renderUserGreeting() {
    const greetingElement = document.getElementById("userGreeting");
    if (currentSession) {
      // Task 1.2: Render a user greeting to `#userGreeting`
      // using `firstName`, `lastName`, and the server-provided
      // login timestamp.

      const { firstName, lastName, loginTime } = currentSession;

      const date = new Date(loginTime);
      const options = { day: "numeric", month: "long", year: "numeric" };
      const formattedDate = date.toLocaleDateString("de-DE", options);
      const formattedTime = date.toLocaleTimeString("de-DE", {
        hour: "2-digit",
        minute: "2-digit",
      });

      // Hi Joe Doe, du hast dich am 19. April 2026 um 21:15 angemeldet.
      greetingElement.textContent = `Hi ${firstName} ${lastName}, du hast dich am ${formattedDate} um ${formattedTime} angemeldet.`;
    } else {
      greetingElement.textContent = messages.loggedOutGreeting;
    }
  }

  function updateUI() {
    const authBtn = document.getElementById("authBtn");
    const addMoviesBtn = document.getElementById("addMoviesBtn");

    renderUserGreeting();
    updateGenres();

    if (currentSession) {
      authBtn.textContent = "Logout";
      authBtn.onclick = () => {
        fetch("/logout")
          .then((response) => {
            if (response.ok) {
              currentSession = null;
              updateUI();
            }
          })
          .catch((error) => {
            console.error("Logout failed:", error);
          });
      };
      addMoviesBtn.style.display = "inline";
    } else {
      removeMovies();
      authBtn.textContent = "Login";
      authBtn.onclick = () => {
        const loginForm = document.getElementById("loginForm");
        loginForm.reset();
        document.getElementById("loginDialog").showModal();
      };
      addMoviesBtn.style.display = "none";
    }
  }

  // Login dialog
  document.getElementById("loginForm").addEventListener("submit", (e) => {
    e.preventDefault(); //for stop page refresh
    const formData = new FormData(e.target);
    const data = Object.fromEntries(formData.entries());
    // Task 1.1: Implement the login submit flow to call `POST /login`
    // with username and password, handle errors, save the response
    // into `currentSession`, then call `updateUI()` and `loadMovies()`.

    // implement the request to POST /login from the login form
    fetch("/login", {
      method: "POST",
      headers: {
        "Content-type": "application/json",
      },
      body: JSON.stringify(data),
    })
      .then((response) => {
        if (!response.ok) {
          throw new Error(messages.loginFailed); // Handle error cases such as invalid credentials.
        }
        return response.json();
      })
      .then((sessionData) => {
        currentSession = sessionData; //On success, store the server response in currentSession
        document.getElementById("loginDialog").close(); // close the pop-ip window

        updateUI(); //call updateUI()
        loadMovies(); //call loadMovies()
      })
      .catch((error) => {
        console.error("Login error:", error);
        alert(messages.loginFailed);
      });
  });

  document.getElementById("cancelLogin").addEventListener("click", () => {
    document.getElementById("loginDialog").close();
  });

  // Search dialog
  document.getElementById("addMoviesBtn").addEventListener("click", () => {
    const searchForm = document.getElementById("searchForm");
    searchForm.reset();
    document.getElementById("searchResults").innerHTML = "";
    document.getElementById("searchDialog").showModal();
  });

  document.getElementById("searchForm").addEventListener("submit", (e) => {
    e.preventDefault();
    const query = document.getElementById("query").value;
    searchMovies(query);
  });

  document.getElementById("cancelSearch").addEventListener("click", () => {
    document.getElementById("searchDialog").close();
  });
};
