import pygame
import random
import sys

pygame.init()

# Constants
WIDTH, HEIGHT = 1000, 700
FPS = 60
WHITE = (255, 255, 255)
BLACK = (0, 0, 0)
RED = (255, 0, 0)
GREEN = (0, 255, 0)
BLUE = (0, 100, 255)
BROWN = (139, 69, 19)
GOLD = (255, 215, 0)
PURPLE = (128, 0, 128)

class Player:
    def __init__(self):
        self.x = WIDTH // 4
        self.y = HEIGHT - 100
        self.width = 40
        self.height = 60
        self.vel_y = 0
        self.jumping = False
        self.lane = 1  # 0=left, 1=center, 2=right
        
    def jump(self):
        if not self.jumping:
            self.vel_y = -15
            self.jumping = True
    
    def move_left(self):
        if self.lane > 0:
            self.lane -= 1
    
    def move_right(self):
        if self.lane < 2:
            self.lane += 1
    
    def update(self):
        # Update position based on lane
        target_x = WIDTH // 4 + self.lane * 100
        self.x += (target_x - self.x) * 0.2
        
        # Gravity
        if self.jumping:
            self.vel_y += 0.8
            self.y += self.vel_y
            if self.y >= HEIGHT - 100:
                self.y = HEIGHT - 100
                self.jumping = False
                self.vel_y = 0
    
    def draw(self, screen):
        pygame.draw.rect(screen, BLUE, (self.x, self.y, self.width, self.height))

class Obstacle:
    def __init__(self, lane):
        self.x = WIDTH
        self.y = HEIGHT - 80
        self.width = 60
        self.height = 80
        self.lane = lane
        self.speed = 8
    
    def update(self):
        self.x -= self.speed
    
    def draw(self, screen):
        x_pos = WIDTH // 4 + self.lane * 100
        pygame.draw.rect(screen, RED, (x_pos, self.y, self.width, self.height))
    
    def is_off_screen(self):
        return self.x < -self.width

class Coin:
    def __init__(self, lane):
        self.x = WIDTH
        self.y = HEIGHT - 150
        self.lane = lane
        self.radius = 15
        self.speed = 8
    
    def update(self):
        self.x -= self.speed
    
    def draw(self, screen):
        x_pos = WIDTH // 4 + self.lane * 100 + 30
        pygame.draw.circle(screen, (255, 215, 0), (int(x_pos), self.y), self.radius)
    
    def is_off_screen(self):
        return self.x < -self.radius * 2

class Game:
    def __init__(self):
        self.screen = pygame.display.set_mode((WIDTH, HEIGHT))
        pygame.display.set_caption("Temple Run")
        self.clock = pygame.time.Clock()
        self.player = Player()
        self.obstacles = []
        self.coins = []
        self.score = 0
        self.distance = 0
        self.game_over = False
        self.font = pygame.font.Font(None, 36)
        
    def spawn_obstacle(self):
        if random.randint(1, 100) < 3:  # 3% chance per frame
            lane = random.randint(0, 2)
            self.obstacles.append(Obstacle(lane))
    
    def spawn_coin(self):
        if random.randint(1, 100) < 2:  # 2% chance per frame
            lane = random.randint(0, 2)
            self.coins.append(Coin(lane))
    
    def check_collisions(self):
        player_rect = pygame.Rect(self.player.x, self.player.y, self.player.width, self.player.height)
        
        # Check obstacle collisions
        for obstacle in self.obstacles:
            if abs(self.player.lane - obstacle.lane) < 0.5:
                obstacle_rect = pygame.Rect(WIDTH // 4 + obstacle.lane * 100, obstacle.y, obstacle.width, obstacle.height)
                if player_rect.colliderect(obstacle_rect):
                    self.game_over = True
        
        # Check coin collisions
        for coin in self.coins[:]:
            if abs(self.player.lane - coin.lane) < 0.5:
                coin_x = WIDTH // 4 + coin.lane * 100 + 30
                if (abs(self.player.x + self.player.width//2 - coin_x) < 30 and 
                    abs(self.player.y + self.player.height//2 - coin.y) < 30):
                    self.coins.remove(coin)
                    self.score += 10
    
    def draw_background(self):
        self.screen.fill(GREEN)
        # Draw lanes
        for i in range(4):
            x = WIDTH // 4 + i * 100
            pygame.draw.line(self.screen, BLACK, (x, 0), (x, HEIGHT), 2)
        # Draw ground
        pygame.draw.rect(self.screen, BROWN, (0, HEIGHT - 20, WIDTH, 20))
    
    def draw_ui(self):
        # Modern UI panel
        ui_surface = pygame.Surface((300, 150))
        ui_surface.set_alpha(200)
        ui_surface.fill((0, 0, 0))
        self.screen.blit(ui_surface, (10, 10))
        
        # Score with glow effect
        score_text = pygame.font.Font(None, 48).render(f"SCORE: {self.score}", True, GOLD)
        self.screen.blit(score_text, (20, 20))
        
        distance_text = pygame.font.Font(None, 32).render(f"Distance: {self.distance}m", True, WHITE)
        self.screen.blit(distance_text, (20, 70))
        
        # Controls hint
        controls_font = pygame.font.Font(None, 24)
        controls = [
            "CONTROLS:",
            "A/D - Move Left/Right", 
            "W/SPACE - Jump",
            "S - Slide (coming soon)",
            "R - Restart"
        ]
        
        for i, control in enumerate(controls):
            color = GOLD if i == 0 else WHITE
            control_text = controls_font.render(control, True, color)
            self.screen.blit(control_text, (20, 110 + i * 25))
        
        if self.game_over:
            # Game over overlay
            overlay = pygame.Surface((WIDTH, HEIGHT))
            overlay.set_alpha(180)
            overlay.fill(BLACK)
            self.screen.blit(overlay, (0, 0))
            
            game_over_font = pygame.font.Font(None, 72)
            game_over_text = game_over_font.render("GAME OVER", True, RED)
            game_over_rect = game_over_text.get_rect(center=(WIDTH//2, HEIGHT//2 - 50))
            self.screen.blit(game_over_text, game_over_rect)
            
            final_score_text = pygame.font.Font(None, 36).render(f"Final Score: {self.score}", True, GOLD)
            final_score_rect = final_score_text.get_rect(center=(WIDTH//2, HEIGHT//2 + 20))
            self.screen.blit(final_score_text, final_score_rect)
            
            restart_text = pygame.font.Font(None, 32).render("Press R to Restart or ESC to Quit", True, WHITE)
            restart_rect = restart_text.get_rect(center=(WIDTH//2, HEIGHT//2 + 70))
            self.screen.blit(restart_text, restart_rect)
    
    def reset_game(self):
        self.player = Player()
        self.obstacles = []
        self.coins = []
        self.score = 0
        self.distance = 0
        self.game_over = False
    
    def run(self):
        running = True
        while running:
            for event in pygame.event.get():
                if event.type == pygame.QUIT:
                    running = False
                elif event.type == pygame.KEYDOWN:
                    if not self.game_over:
                        if event.key == pygame.K_SPACE or event.key == pygame.K_w:
                            self.player.jump()
                        elif event.key == pygame.K_a:
                            self.player.move_left()
                        elif event.key == pygame.K_d:
                            self.player.move_right()
                        elif event.key == pygame.K_s:
                            pass  # Slide feature for future
                    else:
                        if event.key == pygame.K_r:
                            self.reset_game()
                        elif event.key == pygame.K_ESCAPE:
                            running = False
            
            if not self.game_over:
                # Update game objects
                self.player.update()
                self.spawn_obstacle()
                self.spawn_coin()
                
                # Update obstacles
                for obstacle in self.obstacles[:]:
                    obstacle.update()
                    if obstacle.is_off_screen():
                        self.obstacles.remove(obstacle)
                
                # Update coins
                for coin in self.coins[:]:
                    coin.update()
                    if coin.is_off_screen():
                        self.coins.remove(coin)
                
                self.check_collisions()
                self.distance += 1
            
            # Draw everything
            self.draw_background()
            self.player.draw(self.screen)
            
            for obstacle in self.obstacles:
                obstacle.draw(self.screen)
            
            for coin in self.coins:
                coin.draw(self.screen)
            
            self.draw_ui()
            
            pygame.display.flip()
            self.clock.tick(FPS)
        
        pygame.quit()
        sys.exit()

if __name__ == "__main__":
    game = Game()
    game.run()