const fs = require('fs')
const os = require('os')
const path = require('path')
const Task = require('./task')
const render = require('./render')
const git = require('./git-api')

class TaskAPI {
  /**
   *Creates an instance of TaskAPI and create data file if needed
   * @memberof TaskAPI
   */
  constructor () {
    this.tasks = {}
    this.dataPath = path.join(os.homedir(), '.commit-tasks.json')
    try {
      if (!fs.existsSync(this.dataPath)) {
        fs.writeFileSync(this.dataPath, '{}')
      }
      this.tasks = JSON.parse(fs.readFileSync(this.dataPath))
    } catch (error) {
      render.logError(error)
    }
  }

  /**
   *Get the last task in the project
   *
   * @param {String} project
   * @returns {Object}
   * @memberof TaskAPI
   */
  getLastTaskOfProject (project) {
    return this.tasks[project][this.tasks[project].length - 1]
  }

  /**
   *Add a task to a project task list
   *
   * @param {Array<String>} input
   * @param {Boolean} createProject
   * @memberof TaskAPI
   */
  addTask (input, createProject) {
    const project = input[0]
    // check if the user want to create a new project or it's just a typo
    if (!this.tasks[project] && createProject) {
      this.tasks[project] = []
    } else if (!this.tasks[project] && !createProject) {
      render.logError(`There are no projects named ${project}`)
      return
    }
    // remove the project name from the input array and the rest of it is
    // the commit message
    input.shift()
    const message = input.join(' ')
    const lastTask = this.getLastTaskOfProject(project)
    const id = lastTask ? lastTask.id + 1 : 1
    const task = new Task({ id, message, project })
    this.tasks[project].push(task)
    this.save()
    render.logSuccess(`Created task ${message}`)
  }

  /**
   *Draw all tasks in all projects
   *
   * @memberof TaskAPI
   */
  drawTaskList () {
    render.drawTaskList(this.tasks)
  }

  /**
   *Remove a task from a project task list
   *
   * @param {Array<String>} input
   * @memberof TaskAPI
   */
  removeTask (input) {
    const project = input[0]
    let taskId = input[1]
    // check if the input task id is a number
    try {
      taskId = parseInt(taskId)
      // then check if the input task id is exists in the project task list
      if (!this.tasks[project].some(task => task.id === taskId)) {
        return render.logError(
          `There is no task with the id ${taskId} in @${project}`
        )
      }
    } catch (error) {
      return render.logError('Task id is not a number')
    }
    this.tasks[project] = this.tasks[project].filter(task => {
      return task.id !== taskId
    })
    this.save()
    render.logSuccess(`Removed task ${taskId} in @${project}`)
  }

  /**
   *Commit a task in a project
   *
   * @param {*} input
   * @returns
   * @memberof TaskAPI
   */
  commitTask (input) {
    const project = input[0]
    let taskId = input[1]
    const task = this.getTask(project, taskId)
    if (task) {
      git
        .commit(task.message)
        .then(() => {
          render.logSuccess(`Commited task ${taskId} in @${project}`)
          git
            .getLastCommitDetails()
            .then(detail => {
              render.log(detail)
              task.finished = true
              this.save()
            })
            .catch(err => {
              render.logError(err)
            })
        })
        .catch(err => {
          render.logError(err)
        })
    }
  }

  /**
   *Get a task in the task list
   *
   * @param {String} project
   * @param {String || Number} taskId
   * @returns
   * @memberof TaskAPI
   */
  getTask (project, taskId) {
    // check if the input task id is a number
    try {
      taskId = parseInt(taskId)
    } catch (error) {
      return render.logError('Task id is not a number')
    }
    // then check if the project exists
    if (!this.tasks[project]) {
      return render.logError(`Project ${project} doesn't exist!`)
    }
    // then check if the input task id is exists in the project task list
    if (!this.tasks[project].some(task => task.id === taskId)) {
      return render.logError(
        `There is no task with the id ${taskId} in @${project}`
      )
    }
    return this.tasks[project].find(task => task.id === taskId)
  }

  /**
   *Save the all tasks into the data file
   *
   * @memberof TaskAPI
   */
  save () {
    try {
      fs.writeFileSync(this.dataPath, JSON.stringify(this.tasks))
    } catch (error) {
      render.logError(error)
    }
  }
}

module.exports = TaskAPI
